import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Cria uma instância de banco de dados RDS MySQL.
 * @param name Nome do recurso no Pulumi.
 * @param securityGroupId O ID do Security Group criado anteriormente.
 */
export const createRDSInstance = (name: string, securityGroupId: pulumi.Input<string>) => {
    const db = new aws.rds.Instance(name, {
        // --- CONFIGURAÇÕES DE HARDWARE ---
        // db.t3.micro é o tipo mais barato/gratuito, ideal para Sandbox ACG
        instanceClass: "db.t3.micro",
        allocatedStorage: 20, // 20GB de armazenamento (mínimo padrão)
        
        // --- MOTOR DO BANCO ---
        engine: "mysql",
        engineVersion: "8.0",
        
        // --- CREDENCIAIS E ACESSO ---
        dbName: "acgdb",       // Nome do banco de dados inicial
        username: "admin",
        password: "password123", // Lembre-se: em produção use Secret do Pulumi
        
        // --- REDE E SEGURANÇA ---
        // Atribui o firewall (Security Group) que criamos no outro arquivo
        vpcSecurityGroupIds: [securityGroupId],
        // Define se o banco terá um IP público para acesso via Workbench/DBeaver
        publiclyAccessible: true, 

        // --- MANUTENÇÃO E LIMPEZA ---
        // Essencial para Sandbox: evita que o Pulumi trave ao tentar deletar o banco
        skipFinalSnapshot: true,
        deleteAutomatedBackups: true,
    });

    return db;
};