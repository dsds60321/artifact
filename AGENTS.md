# Repository Guidelines

## 협업 커뮤니케이션
- 모든 기여, 코드 리뷰, 이슈 논의는 한국어로만 진행합니다. 필요한 경우 영문 용어는 괄호로 병기하되, 본문 설명은 한글로 작성하세요.

## 프로젝트 개요
- 이 서비스는 개발자 산출물(문서, 결과물) 생성 과정을 표준화하고 자동화해 작업 편의성을 높이기 위해 구축되었습니다.
- 현재 API 명세서 및 API FLOW 생성 기능을 확장하는 중이며, 문서 작성에는 Scalar.js SDK를 사용합니다.
- Scalar 관련 자산은 `src/main/resources/static/js/pages/project/artifact/docs/index.js`와 `templates/project/artifact/docs/index.html`에 위치하며, 백엔드 처리는 `ArtifactController`와 `DocsService`가 담당합니다.

## API 문서화 워크플로
- 프런트엔드: `docs/index.js`에서 Scalar UI를 구성하고 매개변수 유형(path, query, body 등)에 따라 입력 필드를 동적으로 렌더링해야 합니다.
- 템플릿: `docs/index.html`은 Scalar 컨테이너와 동적 폼 마크업을 포함하며, 서버 사이드 렌더링에 맞춰 필요한 데이터를 주입합니다.
- 백엔드: `ArtifactController`는 문서 CRUD 엔드포인트를 노출하고, `DocsService`는 스토리지·변환 로직을 캡슐화합니다. 새 스펙 추가 시 두 계층을 동시에 업데이트하세요.

## Project Structure & Module Organization
- `src/main/java/com/gunho/artifact`: Layered Spring Boot code; `controller`, `service`, `repository`, and `config` packages map directly to API, business, persistence, and wiring concerns.
- `src/main/resources`: `templates/` hosts Thymeleaf views, `static/` serves public assets, and `application.yml` holds environment defaults—override with local profiles instead of editing in-place.
- Tests live in `src/test/java/com/...`; `src/test/generated_tests` is reserved for generated fixtures—keep hand-written suites alongside the package they exercise.

## Build, Test, and Development Commands
- `./gradlew bootRun`: Launches the API with live reload via DevTools; ensure DB credentials are exported before running.
- `./gradlew clean build`: Performs a full compile, runs the unit suite, and produces the runnable jar under `build/libs/`.
- `./gradlew test`: Fast feedback loop for JUnit 5 tests; add `--tests '*ControllerTest'` to target specific classes.

## Coding Style & Naming Conventions
- Target Java 17, four-space indentation, and Lombok annotations for boilerplate; avoid mixing tabs and spaces.
- Package names stay lower-case (e.g., `com.gunho.artifact.security`), classes use PascalCase, and request/response DTOs end with `RequestDto` or `ResponseDto`.
- Favor constructor injection, keep controllers thin, and push validation into `@Service` layers or dedicated `util` helpers.

## Testing Guidelines
- Rely on Spring Boot Starter Test with JUnit Jupiter and Spring Security Test; mock I/O boundaries with `@MockBean`.
- Name files `SomethingTest.java` and mirror production packages so IDE navigation stays 1:1.
- For new features, cover at least happy path plus validation or security edge cases; document gaps in the PR if coverage is partial.

## Commit & Pull Request Guidelines
- Follow the existing `type: summary` pattern (`fix: remove legacy relation table`); prefer English phrases and keep the first line ≤ 72 characters.
- Link issues in the body, call out schema or config impacts, and list manual checks (`curl`, Postman, browser flows).
- PRs need a concise description, screenshots for UI-facing changes, and notes on test commands executed locally.

## Security & Configuration Tips
- Never commit credentials; use environment variables or `application-local.yml` ignored by git.
- Review security-related changes with the `security` package owners before merging.
- When introducing external integrations, document required scopes and callback URLs in the PR and update `config/` if shared constants are needed.
