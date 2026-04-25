import json
import os
import re
import uuid
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from accounts.serializers import get_or_create_profile
from core.models import Certification, Education, Experience, Project, ResumeUpload, Skill


DISALLOWED_REPLY = (
    "I can only help with your resume, skills, projects, job readiness, and "
    "interview preparation inside DakshyaAI. Please ask something related to "
    "your career profile."
)
NO_PROFILE_REPLY = (
    "I need your resume or profile details first. Please upload your resume or "
    "complete your profile."
)
DEFAULT_MODEL = "gpt-4o-mini"
MAX_CONTEXT_CHARS = 7000
MAX_RESUME_CHARS = 2200
MAX_INTERVIEW_QUESTIONS = 5


def load_backend_env():
    global load_dotenv

    if load_dotenv is None:
        try:
            from dotenv import load_dotenv as imported_load_dotenv
        except ImportError:
            imported_load_dotenv = None
        load_dotenv = imported_load_dotenv

    if load_dotenv is None:
        return

    backend_env = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(backend_env)


def get_openai_client_class():
    global OpenAI

    if OpenAI is None:
        try:
            from openai import OpenAI as imported_openai
        except ImportError:
            imported_openai = None
        OpenAI = imported_openai

    return OpenAI


def get_client_and_model():
    load_backend_env()
    client_class = get_openai_client_class()
    if client_class is None:
        raise RuntimeError("OpenAI SDK is not installed.")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured in backend .env.")

    return client_class(api_key=api_key), os.getenv("OPENAI_MODEL", DEFAULT_MODEL)


def compact_lines(lines):
    return "\n".join(line for line in lines if line).strip()


def build_user_context(user):
    profile = get_or_create_profile(user)
    skills = Skill.objects.filter(user=user)[:20]
    projects = Project.objects.filter(user=user)[:12]
    certifications = Certification.objects.filter(user=user)[:12]
    education_items = Education.objects.filter(user=user)[:8]
    experience_items = Experience.objects.filter(user=user)[:10]
    latest_resume = ResumeUpload.objects.filter(user=user).first()

    profile_lines = [
        f"Name: {profile.full_name}" if profile.full_name else "",
        f"Email: {profile.email}" if profile.email else "",
        f"Target role: {profile.target_role}" if profile.target_role else "",
        f"Experience level: {profile.experience_level}" if profile.experience_level else "",
        f"Education: {profile.education}" if profile.education else "",
        f"Current status: {profile.current_status}" if profile.current_status else "",
        f"College/company: {profile.college_or_company}" if profile.college_or_company else "",
        f"Location: {profile.location}" if profile.location else "",
        f"Bio: {profile.short_bio}" if profile.short_bio else "",
    ]

    skill_lines = [
        (
            f"- {skill.name}: {skill.level}, {skill.progress_score}% progress, "
            f"{skill.get_verification_status_display()}, source {skill.source}"
        )
        for skill in skills
    ]
    project_lines = [
        (
            f"- {project.title}: {project.tech_stack}. "
            f"{project.description or 'No description provided.'}"
        )
        for project in projects
    ]
    certification_lines = [
        f"- {item.title}{f' from {item.issuer}' if item.issuer else ''}"
        for item in certifications
    ]
    education_lines = [
        (
            f"- {item.title}"
            f"{f' at {item.institution}' if item.institution else ''}"
            f"{f' ({item.year})' if item.year else ''}"
        )
        for item in education_items
    ]
    experience_lines = [
        (
            f"- {item.title}"
            f"{f' at {item.company}' if item.company else ''}: "
            f"{item.description or 'No description provided.'}"
        )
        for item in experience_items
    ]
    resume_text = (latest_resume.extracted_text or "")[:MAX_RESUME_CHARS] if latest_resume else ""

    sections = [
        "PROFILE\n" + compact_lines(profile_lines),
        "SKILLS\n" + compact_lines(skill_lines),
        "PROJECTS\n" + compact_lines(project_lines),
        "CERTIFICATIONS\n" + compact_lines(certification_lines),
        "EDUCATION ITEMS\n" + compact_lines(education_lines),
        "EXPERIENCE\n" + compact_lines(experience_lines),
        "LATEST RESUME EXTRACT\n" + resume_text.strip(),
    ]
    context = "\n\n".join(section for section in sections if section.strip().split("\n", 1)[-1])
    has_context = any(
        [
            profile.full_name,
            profile.target_role,
            profile.short_bio,
            profile.education,
            skills.exists(),
            projects.exists(),
            certifications.exists(),
            education_items.exists(),
            experience_items.exists(),
            bool(resume_text.strip()),
        ]
    )
    return context[:MAX_CONTEXT_CHARS], has_context


def chat_completion(messages, temperature=0.35, max_tokens=450):
    client, model = get_client_and_model()
    response = client.chat.completions.create(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=messages,
    )
    return response.choices[0].message.content.strip() if response.choices else ""


def extract_json_object(content):
    cleaned = (content or "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(cleaned[start : end + 1])

    raise ValueError("AI returned invalid JSON.")


def ask_eva(user, message):
    context, has_context = build_user_context(user)
    if not has_context:
        return NO_PROFILE_REPLY

    system_prompt = (
        "You are Eva, the DakshyaAI career assistant. You only answer questions "
        "related to the user's resume, profile, skills, projects, education, "
        "certifications, job readiness, interviews, and career improvement. If "
        "the user asks anything outside this domain, refuse politely and reply "
        f"exactly: {DISALLOWED_REPLY} Do not invent information. Use only the "
        "provided user context. Keep responses concise and practical."
    )
    return chat_completion(
        [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"User context:\n{context}"},
            {"role": "user", "content": message},
        ]
    )


def start_interview(user):
    context, has_context = build_user_context(user)
    question_prompt = (
        "Create the first question for a DakshyaAI job-readiness interview. "
        "Ask exactly one question based only on the user's target role, resume, "
        "skills, projects, education, or experience. If context is sparse, ask "
        "the user to explain their target role and strongest project."
    )
    system_prompt = (
        "You are Eva, an AI interview coach for DakshyaAI. Conduct a "
        "job-readiness interview based only on the user's resume/profile context. "
        "Ask one question at a time. Questions must be related to the user's "
        "target role, skills, projects, education, and experience. Do not ask "
        "unrelated questions."
    )
    question = chat_completion(
        [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"User context:\n{context if has_context else 'No profile context yet.'}"},
            {"role": "user", "content": question_prompt},
        ],
        max_tokens=140,
    )
    return {
        "interview_session_id": str(uuid.uuid4()),
        "question_number": 1,
        "question": question,
    }


def answer_interview(user, question_number, question, answer, history):
    context, _ = build_user_context(user)
    next_number = int(question_number or 1) + 1
    is_complete = int(question_number or 1) >= MAX_INTERVIEW_QUESTIONS
    history_text = json.dumps(history or [], ensure_ascii=False)[:5000]

    if is_complete:
        prompt = (
            "The candidate has answered the final question. Return STRICT JSON "
            "with keys feedback, next_question, question_number, is_complete. "
            "Set next_question to an empty string and is_complete to true."
        )
    else:
        prompt = (
            "Review the candidate answer and ask the next interview question. "
            "Return STRICT JSON only with keys feedback, next_question, "
            "question_number, is_complete. Feedback must be one short sentence. "
            f"The next question_number is {next_number}. Ask one question only."
        )

    messages = [
        {
            "role": "system",
            "content": (
                "You are Eva, an AI interview coach for DakshyaAI. Conduct a "
                "job-readiness interview based only on the user's resume/profile "
                "context. Do not ask unrelated questions. Keep feedback brief."
            ),
        },
        {"role": "system", "content": f"User context:\n{context}"},
        {"role": "system", "content": f"Previous interview history:\n{history_text}"},
        {"role": "user", "content": f"Current question: {question}\nCandidate answer: {answer}\n\n{prompt}"},
    ]
    content = chat_completion(messages, max_tokens=360)
    payload = extract_json_object(content)
    return {
        "feedback": str(payload.get("feedback", "")).strip(),
        "next_question": str(payload.get("next_question", "")).strip(),
        "question_number": int(payload.get("question_number", next_number)),
        "is_complete": bool(payload.get("is_complete", is_complete)),
    }


def end_interview(user, history):
    context, _ = build_user_context(user)
    history_text = json.dumps(history or [], ensure_ascii=False)[:7000]
    prompt = """
Return STRICT JSON only:
{
  "overall_feedback": "",
  "strengths": [],
  "weak_points": [],
  "improvement_suggestions": [],
  "recommended_practice": [],
  "communication_feedback": "",
  "technical_gaps": []
}

Use only the user context and interview history. Keep each list to 3-5 concise items.
""".strip()
    content = chat_completion(
        [
            {
                "role": "system",
                "content": (
                    "You are Eva, an AI interview coach for DakshyaAI. Produce "
                    "a final job-readiness report based only on the user's "
                    "profile context and the interview transcript."
                ),
            },
            {"role": "system", "content": f"User context:\n{context}"},
            {"role": "system", "content": f"Interview history:\n{history_text}"},
            {"role": "user", "content": prompt},
        ],
        max_tokens=650,
    )
    payload = extract_json_object(content)
    return {
        "overall_feedback": str(payload.get("overall_feedback", "")).strip(),
        "strengths": payload.get("strengths", []) or [],
        "weak_points": payload.get("weak_points", []) or [],
        "improvement_suggestions": payload.get("improvement_suggestions", []) or [],
        "recommended_practice": payload.get("recommended_practice", []) or [],
        "communication_feedback": str(payload.get("communication_feedback", "")).strip(),
        "technical_gaps": payload.get("technical_gaps", []) or [],
    }
