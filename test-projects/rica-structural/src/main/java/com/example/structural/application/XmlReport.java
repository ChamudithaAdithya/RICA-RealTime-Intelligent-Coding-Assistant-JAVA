package com.example.structural.application;
public class XmlReport { public void generate(Data d){ XmlWriter w=new XmlWriter(); w.open(); w.header(d); w.body(d); w.footer(d); w.close(); }
 static class XmlWriter{ void open(){} void header(Data d){} void body(Data d){} void footer(Data d){} void close(){}}
 static class Data{}
}
