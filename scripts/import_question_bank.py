from __future__ import annotations

import json
from pathlib import Path

PROJECT = Path(r"G:\WORK\ORACLE PRACTICE\oracle-practice-hub")
OUTPUT = PROJECT / "src" / "data" / "generated"
SOURCES = {
    "A": Path(r"C:\Users\mirul\AppData\Local\hermes\profiles\raph\cache\mock_1z0_082\set_a.json"),
    "B": Path(r"C:\Users\mirul\AppData\Local\hermes\profiles\raph\cache\mock_1z0_082\set_b.json"),
    "C": Path(r"C:\Users\mirul\AppData\Local\hermes\profiles\raph\cache\mock_1z0_082\set_c.json"),
    "D": Path(r"G:\WORK\ORACLE PRACTICE\ORACLE EXAM\Oracle_1Z0-082_Mock_Set_D.json"),
}


def normalize(set_name: str, question: dict) -> dict:
    answers = question["answers"]
    normalized = {
        "id": f"{set_name}-{question['number']:02d}",
        "set": set_name,
        "number": question["number"],
        "topic": question.get("topic", "Editorial review"),
        "type": "single" if len(answers) == 1 else "multiple",
        "stem": question["stem"],
        "options": question["options"],
        "answers": answers,
        "explanation": question["explanation"],
    }
    for field in ("references", "confidence", "version"):
        if field in question:
            normalized[field] = question[field]
    option_blob = " ".join(question["options"].values()).lower()
    normalized["shuffleOptions"] = not any(
        marker in option_blob
        for marker in ("all of the above", "none of the above", "both a and", "a and b", "b and c")
    )
    return normalized


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for set_name, path in SOURCES.items():
        payload = json.loads(path.read_text(encoding="utf-8"))
        questions = [normalize(set_name, q) for q in payload["questions"]]
        if len(questions) != 72:
            raise ValueError(f"Set {set_name}: expected 72 questions, found {len(questions)}")
        if [q["number"] for q in questions] != list(range(1, 73)):
            raise ValueError(f"Set {set_name}: numbering is not continuous")
        if any(answer not in q["options"] for q in questions for answer in q["answers"]):
            raise ValueError(f"Set {set_name}: invalid answer option")
        (OUTPUT / f"set-{set_name.lower()}.json").write_text(
            json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        total += len(questions)
        print(f"Set {set_name}: {len(questions)} questions")
    print(f"Total: {total} questions")


if __name__ == "__main__":
    main()
