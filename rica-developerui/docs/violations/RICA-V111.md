# RICA-V111 — File I/O in Controller

<Badge type="danger" text="Error" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `ControllerLayerAnalyzer` (ControllerLayer) |
| Layer | controller |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V103`](./RICA-V103.md) |
| Source | `src/controllerLayerDetector.ts:210` |

## Trigger

A Controller method creates or calls file types (File, Files, Path, InputStream/Reader/Writer, FileChannel, etc.) directly.

### Violating example

```
@RestController
public class ExportController {
    @GetMapping("/export")
    public String export() throws IOException {
        Path p = Paths.get("/tmp/report.txt");
        Files.write(p, "hello".getBytes());
        return Files.readString(p);
    }
}
```


### Fixed version

```
@RestController
public class ExportController {
    private final ReportFileService reportFileService;

    public ExportController(ReportFileService reportFileService) {
        this.reportFileService = reportFileService;
    }

    @GetMapping("/export")
    public String export() {
        return reportFileService.export();
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class ExportController {
+     private final ReportFileService reportFileService;
+
+     public ExportController(ReportFileService reportFileService) {
+         this.reportFileService = reportFileService;
+     }
+
      @GetMapping("/export")
-     public String export() throws IOException {
-         Path p = Paths.get("/tmp/report.txt");
-         Files.write(p, "hello".getBytes());
-         return Files.readString(p);
+     public String export() {
+         return reportFileService.export();
      }
  }
```


## Why it matters

Controllers should not read or write the file system. File handling involves paths, permissions, streaming, and lifecycle concerns that belong in a dedicated service, keeping the controller free of I/O concerns and testable without touching disk.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Extract file operations into a service class.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
2. **Inject the file-service into the controller.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V111 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Move file I/O operations to a service class injected into the controller

## Tags

`file-io` `controller` `service`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
