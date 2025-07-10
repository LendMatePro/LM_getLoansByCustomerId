import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient.js";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

export const handler = async (event) => {
    const respond = (statusCode, message) => ({
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: typeof message === "string" ? message : JSON.stringify(message)
    });

    try {
        let customerId = event.queryStringParameters?.customerId;
        if (!customerId && event.body) {
            const body = JSON.parse(event.body);
            customerId = body.customerId;
        }

        if (!customerId) {
            return respond(400, { message: "customerId is required" });
        }

        const loans = await getLoansByCustomerId(customerId);
        return respond(200, loans);

    } catch (error) {
        console.error("GetLoansByCustomerId Error:", error);
        return respond(500, { message: "Failed to retrieve loans", error: error.message });
    }
};

async function getLoansByCustomerId(customerId) {
    const command = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
            ":pk": { S: "LOAN" },
            ":skPrefix": { S: `CUSTOMER#${customerId}#LOAN#` }
        },
        ScanIndexForward: false
    });

    const result = await ddbClient.send(command);
    const items = result.Items?.map(unmarshall) ?? [];

    return items.map(item => {
        const { loanId, dueDay, amount, rate, interest, notes, customer } = item;
        return {
            customer: {
                customerId: customer.customerId,
                name: customer.name,
                address: customer.address,
                email: customer.email,
                phone: customer.phone
            },
            loan: {
                loanId,
                dueDay,
                amount,
                rate,
                interest,
                notes
            }
        };
    });
}
