import * as aws from "@pulumi/aws";

export const createDatabase = () => {
    const tabela = new aws.dynamodb.Table("minha-tabela", {
        attributes: [
            { name: "id", type: "S" }, // "S" para String
        ],
        hashKey: "id", // Chave primária
        billingMode: "PAY_PER_REQUEST", // Modo econômico (perfeito para sandbox)
        tags: {
            Environment: "Dev",
            Name: "Tabela de Usuarios",
        },
    });

    return tabela;
};