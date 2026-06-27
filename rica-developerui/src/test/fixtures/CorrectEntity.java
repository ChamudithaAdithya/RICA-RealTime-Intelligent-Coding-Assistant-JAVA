package com.example.school;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.math.BigDecimal;

/**
 * Well-architected entity: encapsulates behaviour related to self,
 * does not reference repositories, services, or infrastructure.
 */
@Entity
public class CorrectEntity {

    @Id
    private Long id;
    private String name;
    private String email;
    private BigDecimal balance;
    private String status;
    private int loginAttempts;
    private boolean locked;

    protected CorrectEntity() {}

    public CorrectEntity(String name, String email, BigDecimal initialBalance) {
        this.name = name;
        this.email = email;
        this.balance = initialBalance;
        this.status = "ACTIVE";
        this.loginAttempts = 0;
        this.locked = false;
    }

    public void deposit(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Deposit must be positive");
        }
        this.balance = this.balance.add(amount);
    }

    public boolean withdraw(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Withdrawal must be positive");
        }
        if (amount.compareTo(this.balance) > 0) {
            return false;
        }
        this.balance = this.balance.subtract(amount);
        return true;
    }

    public void lock() {
        this.locked = true;
    }

    public void unlock() {
        this.locked = false;
        this.loginAttempts = 0;
    }

    public void recordFailedLogin() {
        this.loginAttempts++;
        if (this.loginAttempts >= 5) {
            this.locked = true;
        }
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public BigDecimal getBalance() { return balance; }
    public String getStatus() { return status; }
    public int getLoginAttempts() { return loginAttempts; }
    public boolean isLocked() { return locked; }
}
