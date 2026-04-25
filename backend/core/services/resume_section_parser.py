import re


SECTION_ALIASES = {
    "skills": {"skills", "technical skills", "key skills", "core skills"},
    "certifications": {"certifications", "certificates", "certification"},
    "education": {"education", "academic background", "academics"},
    "experience": {
        "experience",
        "work experience",
        "internship",
        "internships",
        "professional experience",
    },
    "projects": {"projects", "personal projects", "academic projects"},
    "links": {"links", "profiles", "social profiles"},
    "summary": {"summary", "objective", "profile", "about"},
}

SKILL_KEYWORDS = [
    "React",
    "Django",
    "Python",
    "JavaScript",
    "TypeScript",
    "HTML",
    "CSS",
    "SQL",
    "Java",
    "C++",
    "Node.js",
    "REST API",
    "Machine Learning",
    "Data Analysis",
    "Communication",
    "DSA",
    "Git",
    "GitHub",
    "Tailwind",
    "Bootstrap",
    "Figma",
]

CERTIFICATION_HINTS = [
    "certified",
    "certification",
    "certificate",
    "course",
    "academy",
    "udemy",
    "coursera",
    "google",
    "microsoft",
    "aws",
]

ROLE_HINTS = [
    "developer",
    "engineer",
    "designer",
    "analyst",
    "manager",
    "intern",
    "architect",
    "consultant",
]


def clean_line(line):
    return re.sub(r"\s+", " ", line.strip(" -•\t\r")).strip()


def normalize_heading(line):
    return re.sub(r"[^a-z0-9 +#./-]", "", line.lower().strip())


def section_for_heading(line):
    normalized = normalize_heading(line)
    normalized = normalized.rstrip(":")
    for section, aliases in SECTION_ALIASES.items():
        if normalized in aliases:
            return section
    return None


def extract_lines(text):
    return [line for line in (clean_line(item) for item in text.splitlines()) if line]


def split_sections(lines):
    sections = {key: [] for key in SECTION_ALIASES}
    sections["other"] = []
    current = "other"

    for line in lines:
        heading = section_for_heading(line)
        if heading:
            current = heading
            continue
        sections[current].append(line)

    return sections


def unique_items(items):
    seen = set()
    output = []
    for item in items:
        cleaned = clean_line(item)
        key = cleaned.lower()
        if cleaned and key not in seen:
            seen.add(key)
            output.append(cleaned)
    return output


def extract_email(text):
    match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    return match.group(0) if match else ""


def extract_phone(text):
    match = re.search(
        r"(?:(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4})",
        text,
    )
    return match.group(0).strip() if match else ""


def extract_url(text, keyword):
    pattern = rf"https?://[^\s,|)>\]]*{keyword}[^\s,|)>\]]*"
    match = re.search(pattern, text, flags=re.IGNORECASE)
    return match.group(0).rstrip(".") if match else ""


def extract_name(lines):
    for line in lines[:8]:
        lower_line = line.lower()
        if (
            "@" in line
            or "http" in lower_line
            or section_for_heading(line)
            or lower_line in {"resume", "curriculum vitae", "cv"}
            or any(char.isdigit() for char in line)
        ):
            continue
        if 2 <= len(line.split()) <= 5:
            return line
    return ""


def extract_role(lines, sections):
    candidates = lines[:12] + sections.get("summary", [])[:3]
    for line in candidates:
        lower_line = line.lower()
        if any(hint in lower_line for hint in ROLE_HINTS) and len(line) <= 100:
            return line
    return ""


def extract_location(lines):
    for line in lines[:12]:
        lower_line = line.lower()
        if any(token in lower_line for token in ["location", "address", "based in"]):
            return re.sub(r"^(location|address)\s*:\s*", "", line, flags=re.IGNORECASE)
    return ""


def extract_skills(text, sections):
    matches = []
    searchable_text = text.lower()

    for skill in SKILL_KEYWORDS:
        escaped = re.escape(skill.lower())
        if re.search(rf"(?<![a-z0-9+#.]){escaped}(?![a-z0-9+#.])", searchable_text):
            matches.append(skill)

    section_text = " ".join(sections.get("skills", []))
    if section_text:
        for part in re.split(r"[,|/]", section_text):
            cleaned = clean_line(part)
            if 1 <= len(cleaned.split()) <= 4:
                matches.append(cleaned)

    return unique_items(matches)


def section_items(sections, key):
    lines = sections.get(key, [])
    return unique_items(line for line in lines if len(line) > 2)


def extract_certifications(lines, sections):
    certifications = section_items(sections, "certifications")
    if certifications:
        return certifications

    fallback = [
        line
        for line in lines
        if any(hint in line.lower() for hint in CERTIFICATION_HINTS)
    ]
    return unique_items(fallback)


def parse_resume_sections(extracted_text):
    lines = extract_lines(extracted_text)
    sections = split_sections(lines)
    github_url = extract_url(extracted_text, "github")
    linkedin_url = extract_url(extracted_text, "linkedin")

    return {
        "basic_info": {
            "name": extract_name(lines),
            "email": extract_email(extracted_text),
            "phone": extract_phone(extracted_text),
            "location": extract_location(lines),
            "role": extract_role(lines, sections),
        },
        "skills": extract_skills(extracted_text, sections),
        "certifications": extract_certifications(lines, sections),
        "education": section_items(sections, "education"),
        "experience": section_items(sections, "experience"),
        "projects": section_items(sections, "projects"),
        "links": {
            "github": github_url,
            "linkedin": linkedin_url,
        },
    }
