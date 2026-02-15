import * as aws from "@pulumi/aws";

/**
 * Cria uma tabela no DynamoDB para armazenamento NoSQL.
 * Foco: Alta performance, escalabilidade automática e baixo custo inicial.
 */
export const createDatabase = () => {
    const tabela = new aws.dynamodb.Table("minha-tabela", {
        // 1. Definição de Atributos
        // Aqui definimos apenas os campos que serão usados como chaves (Keys).
        // Diferente de bancos SQL, você não precisa definir todas as colunas agora.
        attributes: [
            { name: "id", type: "S" }, // "S" (String): O messageId do SQS será guardado aqui.
        ],

        // 2. Chave de Partição (Hash Key)
        // É o identificador exclusivo de cada item. 
        // O DynamoDB usa isso para espalhar os dados entre os servidores.
        hashKey: "id", 

        // 3. Modo de Cobrança (Billing Mode)
        // PAY_PER_REQUEST: Você não paga um valor fixo mensal. 
        // A AWS cobra apenas alguns centavos por milhão de leituras/escritas.
        // É a melhor escolha para ambientes de desenvolvimento (Sandbox).
        billingMode: "PAY_PER_REQUEST", 

        // 4. Organização e Rastreamento
        tags: {
            Environment: "Dev",
            Name: "Tabela de Usuarios",
            Project: "Serverless-SQS-Worker",
            UpdateBy: "PullRequest-Test do vscode"
        },
    });

    return tabela;
};