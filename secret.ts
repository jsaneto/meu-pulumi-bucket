// secret.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";

// O "export" aqui é obrigatório para ser um módulo!
export function createDatabaseSecret() {
    const dbPassword = new random.RandomPassword("db-password", {
        length: 16,
        special: true,
        overrideSpecial: "_!%", 
    });

    const dbSecret = new aws.secretsmanager.Secret("rds-db-secret", {
        description: "Credenciais do RDS",
    });

    new aws.secretsmanager.SecretVersion("db-secret-version", {
        secretId: dbSecret.id,
        secretString: pulumi.jsonStringify({
            username: "admin_user",
            password: dbPassword.result,
        }),
    });

    return { dbSecret, dbPassword };
}

export function enableRotation(secretId: pulumi.Input<string>) {
    return new aws.secretsmanager.SecretRotation("rds-rotation", {
        secretId: secretId,
        rotationRules: {
            automaticallyAfterDays: 30,
        },
        // Ao não passar o LambdaArn e usar apenas a configuração do serviço, 
        // a AWS tenta usar a Managed Rotation.
    });
}