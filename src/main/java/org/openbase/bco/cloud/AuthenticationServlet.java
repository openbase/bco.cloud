package org.openbase.bco.cloud;

import com.google.appengine.repackaged.com.google.api.client.util.Base64;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.protobuf.ByteString;
import org.openbase.bco.authentication.lib.EncryptionHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.BadPaddingException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Enumeration;

@WebServlet(name = "AuthenticationServlet", value = "/auth")
public class AuthenticationServlet extends HttpServlet {

    public static final String CLIENT_ID_KEY = "client_id";
    public static final String REDIRECT_URI_KEY = "redirect_uri";
    public static final String STATE_KEY = "state";
    public static final String RESPONSE_TYPE_KEY = "response_type";
    public static final String ACCESS_TOKEN_KEY = "access_token";
    public static final String TOKEN_TYPE_KEY = "token_type";
    public static final String USER_ID_KEY = "user_id";

    public static final String PARAMETER_KEY = "#";
    public static final String PARAMETER_SEPARATOR = "&";
    public static final String PARAMETER_ASSIGNMENT = "=";

    private static final Logger logger = LoggerFactory.getLogger(AuthenticationServlet.class);

    private static final String CLIENT_ID = "google";
    private static final String PROJECT_ID = "testsmarthome-6203c";
    private static final String REDIRECT_URI = "https://oauth-redirect.googleusercontent.com/r/" + PROJECT_ID;
    private static final String RESPONSE_TYPE_IMPLICIT = "token";
    private static final String TOKEN_TYPE_BEARER = "bearer";

    private static final byte[] ENCRYPTION_KEY = EncryptionHelper.generateKey();

    // http://localhost:8080/auth?client_id=google&redirect_uri=https://oauth-redirect.googleusercontent.com/r/testsmarthome-6203c&state=STATE_STRING&response_type=token
    // http://xenon-blade-203010.appspot.com/auth?client_id=google&redirect_uri=https://oauth-redirect.googleusercontent.com/r/testsmarthome-6203c&state=STATE_STRING&response_type=token

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession();
        log("THIS IS JUST A TEST");


        for(Enumeration<String> attributeName = session.getAttributeNames(); attributeName.hasMoreElements();) {
            System.out.println(attributeName.nextElement());
        }

        if (session.isNew()) {
            logger.info("New session");

            final String clientID = req.getParameter(CLIENT_ID_KEY);
            final String state = req.getParameter(STATE_KEY);
            final String responseType = req.getParameter(RESPONSE_TYPE_KEY);
            String redirectURI = req.getParameter(REDIRECT_URI_KEY);

            if (clientID == null || !clientID.equals(CLIENT_ID)) {
                resp.sendError(400, "Client id invalid");
                return;
            }

            if (redirectURI == null || !redirectURI.equals(REDIRECT_URI)) {
                resp.sendError(400, "Redirect URI type invalid");
                return;
            }

            if (responseType == null || !responseType.equals(RESPONSE_TYPE_IMPLICIT)) {
                resp.sendError(400, "Response type invalid");
                return;
            }

            if (state == null) {
                resp.sendError(400, "State not available");
            }

            redirectURI += PARAMETER_KEY + TOKEN_TYPE_KEY + PARAMETER_ASSIGNMENT + TOKEN_TYPE_BEARER;
            redirectURI += PARAMETER_SEPARATOR + STATE_KEY + PARAMETER_ASSIGNMENT + state;

            session.setAttribute(REDIRECT_URI_KEY, redirectURI);
            session.setAttribute(CLIENT_ID, clientID);
            session.setAttribute(LoginValidationServlet.REDIRECT_KEY, "/auth");

            resp.sendRedirect("/login.jsp");
        } else {
            logger.info("Old session");

            final String username = (String) session.getAttribute(LoginValidationServlet.USERNAME_KEY);
            final String clientID = (String) session.getAttribute(CLIENT_ID);
            String redirectURI = (String) session.getAttribute(REDIRECT_URI_KEY);

            logger.info("Username: " + username + ", clientId: " + clientID + ", redirectURI: " + redirectURI);

            if(username == null) {
                resp.sendError(400, "Username not available");
                return;
            }

            if (clientID == null) {
                resp.sendError(400, "Client not available");
                return;
            }

            if (redirectURI == null) {
                resp.sendError(400, "Redirect URI not available");
                return;
            }

            String accessToken = generateAccessToken(clientID, username, ENCRYPTION_KEY);
            redirectURI += PARAMETER_SEPARATOR + ACCESS_TOKEN_KEY + PARAMETER_ASSIGNMENT + accessToken;

            log("Redirect to: " + redirectURI);
//            resp.sendRedirect(redirectURI);
        }
    }

    public static String generateAccessToken(final String clientId, final String userId, final byte[] key) throws IOException {
        final JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty(CLIENT_ID_KEY, clientId);
        jsonObject.addProperty(USER_ID_KEY, userId);

        final ByteString bytes = EncryptionHelper.encryptSymmetric(jsonObject.toString(), key);
        return Base64.encodeBase64URLSafeString(bytes.toByteArray());
    }

    public static JsonObject readAccessToken(final String token, final byte[] key) throws IOException, BadPaddingException {
        final byte[] decoded = Base64.decodeBase64(token);
        String decrypted = EncryptionHelper.decryptSymmetric(ByteString.copyFrom(decoded), key, String.class);
        return new JsonParser().parse(decrypted).getAsJsonObject();
    }
}
