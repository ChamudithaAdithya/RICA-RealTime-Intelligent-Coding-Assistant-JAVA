package com.example.structural.application;
public class CsvReport { public void generate(XmlReport.Data d){ CsvWriter c=new CsvWriter(); c.open(); c.header(d); c.body(d); c.footer(d); c.close(); }
 static class CsvWriter{ void open(){} void header(XmlReport.Data d){} void body(XmlReport.Data d){} void footer(XmlReport.Data d){} void close(){}}
}
