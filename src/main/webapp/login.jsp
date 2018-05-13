<!DOCTYPE html>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="org.openbase.bco.cloud.LoginValidationServlet" %>

<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn"%>
<html>
<head>
    <title>Title</title>
</head>
<body>
    <div class="container">
        <h2>
            Login
        </h2>

        <form method="POST" action="/login/validation">

            <div>
                <label for="username">Username</label>
                <input type="text" name="username" id="username" size="40" value="${fn:escapeXml(blog.username)}" class="form-control" />
            </div>

            <div>
                <label for="password">Password</label>
                <input type="password" name="password" id="password" size="40" value="${fn:escapeXml(blog.password)}" class="form-control" />
            </div>

            <button type="submit">Login</button>
        </form>

        <b><%= request.getParameter(LoginValidationServlet.ERROR_KEY)%></b>
    </div>
</body>
</html>
