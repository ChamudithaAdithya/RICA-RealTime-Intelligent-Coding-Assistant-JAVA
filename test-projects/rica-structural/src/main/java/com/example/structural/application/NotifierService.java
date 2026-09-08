package com.example.structural.application;

public class NotifierService {
    private EmailService emailService;
    private SmsService smsService;
    private AuditLogService auditLogService;

    // V318 hardcoded multi-notifier
    // RICA-V318 FIX:
    // Publish a domain event or inject a list of notification handlers.
    // The service should not hardcode every notifier target directly.
    // Example fixed shape:
    //   eventPublisher.publishEvent(new OrderConfirmedEvent(o));
    // or iterate over List<NotificationHandler>.
    public void confirm(Order o) {
        emailService.send(o);
        smsService.send(o);
        auditLogService.record(o);
    }

    static class Order {}
    static class EmailService { void send(Order o) {} }
    static class SmsService { void send(Order o) {} }
    static class AuditLogService { void record(Order o) {} }
}
