package com.gecarchive.upload;

import java.util.Map;

import com.gecarchive.upload.config.CloudinaryProperties;
import com.gecarchive.upload.service.CloudinarySignatureService;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CloudinarySignatureServiceTest {

    @Test
    void signsSortedUploadParametersWithSha1AndTheApiSecret() {
        CloudinarySignatureService service = new CloudinarySignatureService(
                new CloudinaryProperties("cloud", "key", "secret", "preset", "folder", true));

        String signature = service.sign(Map.of(
                "timestamp", "1315060510",
                "public_id", "sample",
                "upload_preset", "preset"));

        assertThat(signature).isEqualTo("f7674ca015c4d4403a4c6885a3cb0ff156468640");
    }
}
