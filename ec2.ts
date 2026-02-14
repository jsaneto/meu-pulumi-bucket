import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

/**
 * Cria uma instância individual do EC2 (Elastic Compute Cloud).
 * @param securityGroupId O ID do Security Group que define as regras de firewall para esta máquina.
 */
export const createEC2Instance = (securityGroupId: pulumi.Output<string>) => {
    
    // 1. Busca Automática pela AMI (Amazon Machine Image)
    // Em vez de fixar um ID (que muda por região), buscamos a imagem oficial do Ubuntu.
    const ami = aws.ec2.getAmi({
        filters: [{ 
            name: "name", 
            // Filtra pela versão Jammy Jellyfish (22.04 LTS) para arquitetura x86_64
            values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"] 
        }],
        owners: ["099720109477"], // ID oficial da Canonical (empresa por trás do Ubuntu)
        mostRecent: true, // Garante que pegaremos a imagem com os patches de segurança mais atuais
    });

    // 2. Criação do Recurso de Instância
    return new aws.ec2.Instance("minha-instancia", {
        // .then() é usado porque a busca da AMI é uma Promise (assíncrona)
        ami: ami.then(a => a.id), 
        
        // Tipo da instância (t3.micro faz parte do Free Tier da AWS em algumas regiões)
        instanceType: "t3.micro",
        
        // Associa o Security Group criado no módulo de rede
        vpcSecurityGroupIds: [securityGroupId],
        
        // Tags para identificação e organização no console da AWS
        tags: { 
            Name: "Servidor-Node",
            Environment: "Desenvolvimento"
        },
    });
};