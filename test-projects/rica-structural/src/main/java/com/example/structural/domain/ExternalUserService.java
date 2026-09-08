package com.example.structural.domain;

import software.amazon.awssdk.services.s3.S3Client; // V301 external SDK without adapter

public class ExternalUserService {
    // RICA-V301 FIX:
    // Hide the S3 SDK behind a project-owned adapter/gateway interface.
    // Domain/application code should depend on the port, not the vendor SDK.
    // Example fixed shape:
    //   StorageGateway storageGateway;
    //   storageGateway.listBuckets();
    public void send() {
        S3Client client = S3Client.create();
        client.listBuckets();
    }
}
