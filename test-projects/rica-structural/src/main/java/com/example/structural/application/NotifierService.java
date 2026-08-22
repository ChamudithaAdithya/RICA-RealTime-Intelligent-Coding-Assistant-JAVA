package com.example.structural.application;
public class NotifierService {
    private EmailService emailService; private SmsService smsService; private AuditLogService auditLogService;
    // V318 3 notifiers
    public void confirm(Order o){ emailService.send(o); smsService.send(o); auditLogService.record(o); }
    static class Order{} static class EmailService{ void send(Order o){}} static class SmsService{ void send(Order o){}} static class AuditLogService{ void record(Order o){}}
}
