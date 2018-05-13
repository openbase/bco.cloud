package org.openbase.bco.cloud.connector;

/*-
 * #%L
 * BCO Cloud Connector
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

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.openbase.bco.registry.remote.Registries;
import org.openbase.jul.exception.StackTracePrinter;
import org.openbase.jul.exception.printer.ExceptionPrinter;
import org.openbase.jul.exception.printer.LogLevel;
import org.slf4j.LoggerFactory;
import rst.domotic.unit.UnitConfigType.UnitConfig;
import rst.domotic.unit.UnitTemplateType.UnitTemplate.UnitType;

import java.util.UUID;

public class TestMain {

    public static void main(String[] args) {
        final Gson gson = new GsonBuilder().setPrettyPrinting().create();
        final FulfillmentHandler fulfillmentHandler = new FulfillmentHandler();

        // test sync
//        JsonObject syncRequest = new JsonObject();
//        syncRequest.addProperty(FulfillmentHandler.REQUEST_ID_KEY, UUID.randomUUID().toString());
//        JsonArray inputs = new JsonArray();
//        JsonObject input = new JsonObject();
//        inputs.add(input);
//        input.addProperty("intent", "action.devices.SYNC");
//        syncRequest.add("inputs", inputs);
//        System.out.println(gson.toJson(syncRequest));
//
//        try {
//            JsonObject jsonObject = fulfillmentHandler.handleRequest(syncRequest);
//            System.out.println(gson.toJson(jsonObject));
//        } catch (CouldNotPerformException ex) {
//            System.err.println("Error: " + ex);
//        }

        // test query
//        JsonObject query = new JsonObject();
//        query.addProperty(FulfillmentHandler.REQUEST_ID_KEY, UUID.randomUUID().toString());
//        JsonArray inputs = new JsonArray();
//        query.add("inputs", inputs);
//        JsonObject input = new JsonObject();
//        inputs.add(input);
//        input.addProperty("intent", "action.devices.QUERY");
//        JsonObject payload = new JsonObject();
//        input.add("payload", payload);
//        JsonArray devices = new JsonArray();
//        payload.add("devices", devices);
//        try {
//            for (UnitConfig unitConfig : Registries.getUnitRegistry(true).getUnitConfigs(UnitType.LIGHT)) {
//                JsonObject device = new JsonObject();
//                device.addProperty("id", unitConfig.getId());
//                devices.add(device);
//            }
//
//            System.out.println(gson.toJson(query));
//
//            JsonObject jsonObject = fulfillmentHandler.handleRequest(query);
//            System.out.println(gson.toJson(jsonObject));
//        } catch (Exception ex) {
//            ExceptionPrinter.printHistory(ex, LoggerFactory.getLogger(TestMain.class));
//            System.exit(1);
//        }

        // test execution
        JsonObject request = new JsonObject();
        request.addProperty(FulfillmentHandler.REQUEST_ID_KEY, UUID.randomUUID().toString());
        JsonArray inputs = new JsonArray();
        request.add("inputs", inputs);
        JsonObject input = new JsonObject();
        inputs.add(input);
        input.addProperty("intent", "action.devices.EXECUTE");
        JsonObject payload = new JsonObject();
        input.add("payload", payload);
        JsonArray commands = new JsonArray();
        payload.add("commands", commands);
        JsonObject command = new JsonObject();
        commands.add(command);
        JsonArray devices = new JsonArray();
        command.add("devices", devices);
        try {
            for (UnitConfig unitConfig : Registries.getUnitRegistry(true).getUnitConfigs(UnitType.LIGHT)) {
                JsonObject device = new JsonObject();
                device.addProperty("id", unitConfig.getId());
                devices.add(device);
            }

            JsonArray execution = new JsonArray();
            command.add("execution", execution);
            JsonObject execute = new JsonObject();
            execution.add(execute);
            execute.addProperty("command", "action.devices.commands.OnOff");
            JsonObject params = new JsonObject();
            execute.add("params", params);
            params.addProperty("on", true);

            System.out.println(gson.toJson(request));

            JsonObject jsonObject = fulfillmentHandler.handleRequest(request);
            System.out.println(gson.toJson(jsonObject));
        } catch (Exception ex) {
            StackTracePrinter.printStackTrace(ex.getStackTrace(), LoggerFactory.getLogger(TestMain.class), LogLevel.INFO);
            ExceptionPrinter.printHistory(ex, LoggerFactory.getLogger(TestMain.class));
            System.exit(1);
        }
        /*{
  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
  "inputs": [{
    "intent": "action.devices.EXECUTE",
    "payload": {
      "commands": [{
        "devices": [{
          "id": "123",
          "customData": {
            "fooValue": 74,
            "barValue": true,
            "bazValue": "sheepdip"
          }
        },{
          "id": "456",
          "customData": {
            "fooValue": 36,
            "barValue": false,
            "bazValue": "moarsheep"
          }
        }],
        "execution": [{
          "command": "action.devices.commands.OnOff",
          "params": {
            "on": true
          }
        }]
      }]
    }
  }]
}*/


        System.exit(0);
    }
}
