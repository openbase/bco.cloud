package org.openbase.bco.cloud;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

@WebServlet(name = "LoginValidationServlet", value = "/login/validation")
public class LoginValidationServlet extends HttpServlet {

    public static final String USERNAME_KEY = "username";
    public static final String PASSWORD_KEY = "password";
    public static final String ERROR_KEY = "error";
    public static final String REDIRECT_KEY = "redirect";

    private static final String testUsername = "bcoUser";
    private static final String testPassword = "bCoPassword";

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        final String username = req.getParameter(USERNAME_KEY);
        final String password = req.getParameter(PASSWORD_KEY);

        if (username == null || password == null) {
            resp.sendError(400, "Username or password not available");
        }

        if (username.equals(testUsername) && password.equals(testPassword)) {
            final HttpSession session = req.getSession();

            // add username to session
            session.setAttribute(USERNAME_KEY, username);

            // redirect to where the login process has been started
            String redirect = (String) session.getAttribute(REDIRECT_KEY);
            if (redirect == null) {
                resp.sendRedirect("/");
            } else {
                resp.sendRedirect(redirect);
            }

            return;
        }

        //TODO: make login.jsp available at /login
        resp.sendRedirect("/login.jsp?" + ERROR_KEY + "=" + "Username or password wrong!");
    }
}
