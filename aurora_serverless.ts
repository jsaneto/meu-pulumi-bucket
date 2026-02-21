import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Cria um Cluster Amazon Aurora Serverless v2 (PostgreSQL).
 */
export const createAuroraServerless = (name: string, securityGroupId: pulumi.Input<string>) => {

    // --- 1. O CLUSTER POSTGRESQL ---
    const cluster = new aws.rds.Cluster(`${name}-cluster`, {
        // Mudança de engine para postgres
        engine: "aurora-postgresql",
        // Versão estável do Aurora PostgreSQL (verificar disponibilidade na região)
        engineVersion: "15.4", 
        engineMode: "provisioned", 
        databaseName: "aurorapostgres",
        masterUsername: "postgres", // Nome padrão comum no Postgres
        masterPassword: "password123",

        // Configuração de Escala (Corrigida conforme o erro anterior)
        serverlessv2ScalingConfiguration: {
            minCapacity: 0.5,
            maxCapacity: 2.0, 
        },

        vpcSecurityGroupIds: [securityGroupId],
        skipFinalSnapshot: true,
    });

    // --- 2. A INSTÂNCIA SERVERLESS ---
    const instance = new aws.rds.ClusterInstance(`${name}-instance`, {
        clusterIdentifier: cluster.id,
        instanceClass: "db.serverless",
        engine: "aurora-postgresql", // Deve ser igual ao motor do cluster
        engineVersion: cluster.engineVersion,
        publiclyAccessible: true,
    });

    return { cluster, instance };
};