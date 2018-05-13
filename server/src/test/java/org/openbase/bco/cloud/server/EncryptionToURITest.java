package org.openbase.bco.cloud.server;

/*-
 * #%L
 * BCO Cloud Server
 * %%
 * Copyright (C) 2018 openbase.org
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/gpl-3.0.html>.
 * #L%
 */

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.protobuf.ByteString;
import org.apache.commons.codec.binary.Base64;
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
