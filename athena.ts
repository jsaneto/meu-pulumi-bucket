import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createAthenaInfrastructure(name: string, dataBucketArn: pulumi.Output<string>) {
    
    // 1. Bucket para armazenar os resultados das queries (Obrigatório para o Athena)
    const queryResultsBucket = new aws.s3.Bucket(`${name}-athena-results`, {
        forceDestroy: true,
    });

    // 2. Database do Athena
    // Nota: Nomes de Database no Athena não podem ter hífens (-), apenas underscores (_)
    const database = new aws.athena.Database(`${name}-db`, {
        name: name.replace(/-/g, "_") + "_db",
        bucket: queryResultsBucket.id, // Onde o Athena guarda metadados se necessário
    });

    // 3. Workgroup do Athena
    // Define isolamento de consultas e onde os arquivos CSV de resultado serão salvos
    const workgroup = new aws.athena.Workgroup(`${name}-workgroup`, {
        name: `${name}-workgroup`,
        state: "ENABLED",
        configuration: {
            enforceWorkgroupConfiguration: true,
            resultConfiguration: {
                outputLocation: queryResultsBucket.id.apply(id => `s3://${id}/results/`),
            },
        },
    });

    return {
        athenaDbName: database.name,
        athenaWorkgroup: workgroup.name,
        resultsBucket: queryResultsBucket.id
    };
}