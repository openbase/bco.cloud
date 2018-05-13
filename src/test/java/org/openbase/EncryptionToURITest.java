package org.openbase;

import com.google.appengine.repackaged.com.google.api.client.util.Base64;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.protobuf.ByteString;
import org.junit.Test;
import org.openbase.bco.authentication.lib.EncryptionHelper;

import javax.crypto.BadPaddingException;
import java.io.IOException;

public class EncryptionToURITest {

    @Test
    public void encryptionToURITest() throws Exception {
        final byte[] key = EncryptionHelper.generateKey();
        String token = generateToken("google", "bco", key);
        System.out.println(token);
        JsonObject jsonObject = readToken(token, key);
        System.out.println(jsonObject.toString());
    }

    private String generateToken(final String clientId, final String userId, final byte[] key) throws IOException {
        final JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("client_id", "google");
        jsonObject.addProperty("user_id", "bco");
        System.out.println(jsonObject.toString());

        final ByteString bytes = EncryptionHelper.encryptSymmetric(jsonObject.toString(), key);
        return Base64.encodeBase64URLSafeString(bytes.toByteArray());
    }

    private JsonObject readToken(final String token, final byte[] key) throws IOException, BadPaddingException {
        final byte[] decoded = Base64.decodeBase64(token);
        String decrypted = EncryptionHelper.decryptSymmetric(ByteString.copyFrom(decoded), key, String.class);
        return new JsonParser().parse(decrypted).getAsJsonObject();
    }
}
