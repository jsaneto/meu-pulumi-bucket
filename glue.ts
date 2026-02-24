import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createGlueInfrastructure(name: string, dataBucketId: pulumi.Output<string>) {
    
    // 1. Role de IAM para o Glue Crawler conseguir ler o S3 e escrever no Catálogo
    const glueRole = new aws.iam.Role(`${name}-glue-role`, {
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: { Service: "glue.amazonaws.com" },
            }],
        }),
    });

    // Política gerenciada pela AWS que dá as permissões básicas de Crawler
    const policyAttachment = new aws.iam.RolePolicyAttachment(`${name}-glue-service-attachment`, {
        role: glueRole.name,
        policyArn: "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole",
    });

    // Permissão extra para o Glue ler o SEU bucket de dados específico
    const s3Policy = new aws.iam.RolePolicy(`${name}-glue-s3-policy`, {
        role: glueRole.id,
        policy: dataBucketId.apply(id => JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Action: ["s3:GetObject", "s3:PutObject"],
                Resource: [`arn:aws:s3:::${id}/*`],
            }],
        })),
    });

    // 2. Database no Glue (onde a tabela será criada)
    const glueDatabase = new aws.glue.CatalogDatabase(`${name}-glue-db`, {
        name: name.replace(/-/g, "_") + "_glue_db",
    });

    // 3. O Crawler: O "robô" que mapeia os dados
    const crawler = new aws.glue.Crawler(`${name}-crawler`, {
        databaseName: glueDatabase.name,
        role: glueRole.arn,
        s3Targets: [{
            path: dataBucketId.apply(id => `s3://${id}`),
        }],
        // O crawler rodará sob demanda (você clica em "Run" no console)
        description: "Crawler para mapear dados do Firehose no S3",
    });

    return {
        glueDatabaseName: glueDatabase.name,
        crawlerName: crawler.name,
    };
}