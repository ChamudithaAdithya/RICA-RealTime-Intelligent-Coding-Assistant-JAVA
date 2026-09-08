package com.example.structural.application;

public class XmlReport {
    // V317 duplicated report algorithm
    // RICA-V317 FIX:
    // Extract the shared algorithm skeleton into a Template Method.
    // Let subclasses provide only the format-specific writer steps.
    // Example fixed shape:
    //   abstract class ReportGenerator { final void generate(Data d) { open(); header(d); body(d); close(); } }
    //   class XmlReport extends ReportGenerator { protected void body(Data d) { ... } }
    public void generate(Data d) {
        XmlWriter w = new XmlWriter();
        w.open();
        w.header(d);
        w.body(d);
        w.footer(d);
        w.close();
    }

    static class XmlWriter {
        void open() {}
        void header(Data d) {}
        void body(Data d) {}
        void footer(Data d) {}
        void close() {}
    }

    static class Data {}
}
