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

### Before (violates)

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


### After (fixed)

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


## Why it matters

Controllers should not read or write the file system. File handling involves paths, permissions, streaming, and lifecycle concerns that belong in a dedicated service, keeping the controller free of I/O concerns and testable without touching disk.

## How to fix

1. Extract file operations into a service class.
2. Inject the file-service into the controller.

## Mitigation hint

> Move file I/O operations to a service class injected into the controller

## Tags

`file-io` `controller` `service`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
