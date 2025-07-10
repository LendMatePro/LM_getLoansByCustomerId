import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient.js";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

export const handler = async (event) => {
    const respond = (statusCode, message) => ({
        statusCode,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: typeof message === "string" ? message : JSON.stringify(message)
    });

    try {
        // Support both query string and JSON body input
        let customerId = event.queryStringParameters?.customerId;

        if (!customerId) {
            return respond(400, { message: "customerId is required" });
        }

        const command = new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": { S: "LOAN" },
                ":skPrefix": { S: `CUSTOMER#${customerId}#LOAN#` }
            }
        });

        const result = await ddbClient.send(command);
        const loans = (result.Items || []).map(unmarshall);

        return respond(200, { loans });
    } catch (error) {
        console.error("GetLoansByCustomerId Error:", error);
        return respond(500, { message: "Failed to retrieve loans" });
    }
};
