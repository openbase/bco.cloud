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
