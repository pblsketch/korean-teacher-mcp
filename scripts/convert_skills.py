"""
TypeScript 프롬프트 파일을 Skill Creator 2.0 SKILL.md 형식으로 변환하는 스크립트.
"""

import re
from pathlib import Path

# 프로젝트 루트: 스크립트 위치 기준으로 상위 디렉토리
PROJECT_ROOT = Path(__file__).resolve().parent.parent

INPUT_DIR = PROJECT_ROOT / "src" / "prompts"
OUTPUT_BASE = PROJECT_ROOT / ".claude" / "skills"


def extract_description(source: str) -> str:
    """단일 따옴표로 감싸진 description 값을 추출한다."""
    match = re.search(r"export const description\s*=\s*'([^']*)'", source)
    if not match:
        raise ValueError("description을 찾을 수 없습니다.")
    return match.group(1)


def extract_content(source: str) -> str:
    """백틱 템플릿 리터럴로 감싸진 content 값을 추출한다."""
    match = re.search(r"export const content\s*=\s*`(.*?)`", source, re.DOTALL)
    if not match:
        raise ValueError("content를 찾을 수 없습니다.")
    return match.group(1)


def convert_file(ts_file: Path) -> Path:
    """단일 TS 파일을 변환하고 출력 경로를 반환한다."""
    source = ts_file.read_text(encoding="utf-8")

    description = extract_description(source)
    content = extract_content(source)

    # 파일명에서 확장자 제거 → 스킬 이름 생성 (예: pbl.ts → teacher-pbl)
    skill_name = f"teacher-{ts_file.stem}"

    # 출력 디렉토리 생성
    output_dir = OUTPUT_BASE / skill_name
    output_dir.mkdir(parents=True, exist_ok=True)

    # SKILL.md 내용 구성
    skill_md = f'---\nname: {skill_name}\ndescription: "{description}"\n---\n{content}'

    output_file = output_dir / "SKILL.md"
    output_file.write_text(skill_md, encoding="utf-8")

    return output_file


def main():
    # index.ts를 제외한 모든 TS 파일 수집
    ts_files = [f for f in INPUT_DIR.glob("*.ts") if f.name != "index.ts"]

    if not ts_files:
        print("변환할 파일이 없습니다.")
        return

    print(f"총 {len(ts_files)}개 파일 변환 시작...\n")

    success, failed = [], []

    for ts_file in sorted(ts_files):
        try:
            output = convert_file(ts_file)
            print(f"  [OK] {ts_file.name} → {output.relative_to(PROJECT_ROOT)}")
            success.append(ts_file.name)
        except Exception as e:
            print(f"  [ERR] {ts_file.name}: {e}")
            failed.append(ts_file.name)

    print(f"\n완료: 성공 {len(success)}개, 실패 {len(failed)}개")
    if failed:
        print(f"실패 목록: {', '.join(failed)}")


if __name__ == "__main__":
    main()
