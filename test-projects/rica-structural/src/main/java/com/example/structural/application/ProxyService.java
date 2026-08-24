package com.example.structural.application;

import javax.sql.DataSource;

public class ProxyService {
    // V322 missing proxy — direct DataSource
    public void process(){
        DataSource ds = new DataSource(){ public java.sql.Connection getConnection(){return null;} public java.sql.Connection getConnection(String u,String p){return null;} public java.io.PrintWriter getLogWriter(){return null;} public void setLogWriter(java.io.PrintWriter out){} public void setLoginTimeout(int s){} public int getLoginTimeout(){return 0;} public java.util.logging.Logger getParentLogger(){return null;} public <T> T unwrap(Class<T> i){return null;} public boolean isWrapperFor(Class<?> i){return false;}};
        try{ ds.getConnection(); } catch(Exception e){}
    }
}
