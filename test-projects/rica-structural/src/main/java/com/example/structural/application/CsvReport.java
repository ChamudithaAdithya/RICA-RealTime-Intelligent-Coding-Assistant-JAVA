package com.example.structural.application;

public class CsvReport {
    // V317 duplicated report algorithm
    // RICA-V317 FIX:
    // Reuse the same template algorithm as XmlReport and vary only writer behavior.
    // This avoids duplicated open/header/body/footer/close sequences.
    // Example fixed shape:
    //   class CsvReport extends ReportGenerator {
    //       protected void body(Data d) { csvWriter.body(d); }
    //   }
    public void generate(XmlReport.Data d) {
        CsvWriter c = new CsvWriter();
        c.open();
        c.header(d);
        c.body(d);
        c.footer(d);
        c.close();
    }

    static class CsvWriter {
        void open() {}
        void header(XmlReport.Data d) {}
        void body(XmlReport.Data d) {}
        void footer(XmlReport.Data d) {}
        void close() {}
    }
}
