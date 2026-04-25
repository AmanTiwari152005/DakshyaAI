import json
import os
import re
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # Keeps Django bootable until dependencies are installed.
    load_dotenv = None

try:
    from openai import OpenAI
except ImportError:  # Keeps non-quiz features available if the SDK is missing.
    OpenAI = None


class QuizGenerationError(Exception):
    pass


DEFAULT_MODEL = "gpt-4o-mini"
LETTERS = ("A", "B", "C", "D")


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


def parse_json_content(content):
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
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError as exc:
            raise QuizGenerationError("OpenAI returned invalid JSON.") from exc

    raise QuizGenerationError("OpenAI returned invalid JSON.")


def validate_quiz_payload(payload, skill_name, difficulty):
    if not isinstance(payload, dict):
        raise QuizGenerationError("Quiz response was not a JSON object.")

    questions = payload.get("questions")
    if not isinstance(questions, list) or len(questions) != 10:
        raise QuizGenerationError("Quiz must contain exactly 10 questions.")

    normalized_questions = []
    for index, question in enumerate(questions, start=1):
        options = question.get("options") if isinstance(question, dict) else None
        if not isinstance(options, dict):
            raise QuizGenerationError("Each quiz question must include options.")

        normalized_options = {}
        for letter in LETTERS:
            value = str(options.get(letter, "")).strip()
            if not value:
                raise QuizGenerationError("Each question must include options A, B, C, and D.")
            normalized_options[letter] = value

        correct_answer = str(question.get("correct_answer", "")).strip().upper()
        if correct_answer not in LETTERS:
            raise QuizGenerationError("Correct answers must be A, B, C, or D.")

        question_text = str(question.get("question", "")).strip()
        explanation = str(question.get("explanation", "")).strip()
        if not question_text or not explanation:
            raise QuizGenerationError("Each question must include text and an explanation.")

        normalized_questions.append(
            {
                "id": index,
                "question": question_text,
                "options": normalized_options,
                "correct_answer": correct_answer,
                "explanation": explanation,
            }
        )

    return {
        "skill": str(payload.get("skill") or skill_name).strip(),
        "difficulty": str(payload.get("difficulty") or difficulty).strip(),
        "questions": normalized_questions,
    }


def generate_skill_quiz(skill_name, difficulty="intermediate"):
    load_backend_env()

    openai_client_class = get_openai_client_class()
    if openai_client_class is None:
        raise QuizGenerationError(
            "OpenAI SDK is not installed. Run: pip install openai python-dotenv"
        )

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise QuizGenerationError("OPENAI_API_KEY is not configured in backend .env.")

    model = os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
    client = openai_client_class(api_key=api_key)
    skill_name = str(skill_name).strip()
    difficulty = str(difficulty or "intermediate").strip().lower()

    prompt = f"""
Generate a skill assessment quiz for "{skill_name}" at "{difficulty}" difficulty.

Return STRICT JSON only. No markdown, no comments, no prose outside JSON.

JSON shape:
{{
  "skill": "{skill_name}",
  "difficulty": "{difficulty}",
  "questions": [
    {{
      "id": 1,
      "question": "",
      "options": {{
        "A": "",
        "B": "",
        "C": "",
        "D": ""
      }},
      "correct_answer": "A",
      "explanation": ""
    }}
  ]
}}

Rules:
- Exactly 10 questions.
- Exactly 4 options per question: A, B, C, D.
- correct_answer must be A, B, C, or D only.
- Explanations must be short and clear.
- Questions must be directly related to the selected skill.
- Avoid repeating concepts or questions.
- Return valid JSON only.
""".strip()

    try:
        response = client.chat.completions.create(
            model=model,
            temperature=0.6,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You create concise technical MCQ quizzes and return strict JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
        )
    except Exception as exc:
        raise QuizGenerationError("Unable to generate quiz right now.") from exc

    content = response.choices[0].message.content if response.choices else ""
    payload = parse_json_content(content)
    return validate_quiz_payload(payload, skill_name, difficulty)
