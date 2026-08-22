package com.example.structural.domain;

import software.amazon.awssdk.services.s3.S3Client; // V301 external SDK without adapter

public class ExternalUserService {
    public void send() {
        S3Client client = S3Client.create();
        client.listBuckets();
    }
}
