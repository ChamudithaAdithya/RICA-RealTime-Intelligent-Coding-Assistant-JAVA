# RICA Java Test Projects

This folder contains Java projects used to test and demonstrate the RICA VS Code extension.

There are two different purposes:

- **RICA detector testing:** open a project in VS Code and run `Java AST: Analyze Full Project`, or run `npm run test:projects` from `rica-developerui`.
- **Java/Maven run testing:** compile or run the sample projects like normal Java projects.

## Projects

| Project | Type | Purpose | Expected RICA result |
| --- | --- | --- | --- |
| `rica-clean` | Spring Boot 3 project | Clean layered/Clean Architecture example | 0 violations |
| `rica-violations-heavy` | Spring Boot 3 project | Intentionally bad architecture and API examples | Many seeded violations |
| `rica-structural` | Normal Maven Java project | Design-pattern opportunity examples | Design-pattern warnings |
| `Patient Management System with Microservices` | Real open-source Spring microservices project | Real-project evaluation evidence | Real-world findings and possible false positives |

## Requirements

- Java 17 or newer
- Maven 3.8 or newer
- VS Code with the RICA extension installed, or the Extension Development Host running from source

## Run Maven Compile Checks

From this `test-projects` folder:

```powershell
mvn -f .\rica-clean\pom.xml test
mvn -f .\rica-violations-heavy\pom.xml test
mvn -f .\rica-structural\pom.xml test
```

All three projects should compile successfully.

## Run The Spring Boot Projects

### Clean Spring Boot Project

```powershell
cd .\rica-clean
mvn spring-boot:run
```

This starts the clean demo application. It is mainly used to prove that a normal, compliant Spring project can be opened and analyzed by RICA without expected violations.

For a short startup check that does not keep the web server running:

```powershell
mvn spring-boot:run -D"spring-boot.run.arguments=--spring.main.web-application-type=none"
```

### Violation-Heavy Spring Boot Project

```powershell
cd .\rica-violations-heavy
mvn spring-boot:run
```

This project is intentionally bad. It contains examples such as controller business logic, repository bypass, raw SQL usage, file I/O in controllers, API boundary issues, and dependency problems.

Do not treat this project as a good Spring Boot design. Its purpose is to produce RICA findings.

For a short startup check:

```powershell
mvn spring-boot:run -D"spring-boot.run.arguments=--spring.main.web-application-type=none"
```

## Run The Normal Java Structural Project

```powershell
cd .\rica-structural
mvn exec:java
```

Expected output:

```text
RICA structural detector fixture project is ready.
```

This project exists to exercise design-pattern opportunity rules such as Strategy, Factory, Builder, Composite, State, Template Method, Command, Bridge, Mediator, Visitor, Memento, Iterator, and Interpreter candidates.

## Run RICA Detector Verification

From the extension folder:

```powershell
cd ..\rica-developerui
npm run compile
npm run test:projects
```

This command does not run the Java applications. It parses the Java source files and verifies that the deterministic RICA rules are covered by the controlled projects.

## Use In VS Code

1. Open one of these project folders in VS Code.
2. Install or run the RICA extension.
3. Run `Java AST: Analyze Full Project`.
4. Open `Java AST: Show Architecture Violations`.
5. Click `Docs` on a violation row to open the rule documentation.

Recommended demo order:

1. Open `rica-clean` and show no expected findings.
2. Open `rica-violations-heavy` and show layer/API/package violations.
3. Open `rica-structural` and show design-pattern opportunity warnings.
4. Open the real Patient Management microservices project and explain real-world findings and false-positive review.

## In-Code Fix Guidance

The violation-heavy and structural fixture projects include comments like `RICA-V106 FIX:` directly beside selected violating code.

These comments are educational guidance for demonstrations. They explain how a developer should fix the issue, but the code is intentionally not fixed because the projects must continue to trigger RICA detections.

During the viva, use this flow:

1. Open a Java fixture file with a visible RICA underline.
2. Show the diagnostic hover or Architecture Violations panel row.
3. Point to the nearby `RICA-Vxxx FIX:` comment.
4. Explain that RICA detects the violation and the fixture comment shows the intended remediation path.

## Important Note

The controlled projects are not production systems. They are test fixtures. Some code is intentionally poor so that RICA has known violations to detect. This is normal for static-analysis evaluation because the test data must include both clean and violating examples.
