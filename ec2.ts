import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export const createEC2Instance = (
    securityGroupId: pulumi.Output<string>, 
    subnetId: pulumi.Input<string> // <--- Novo parâmetro
) => {
    
    // 1. Criamos a Role (Regra) do IAM para a EC2
    // Isso define que o serviço EC2 pode "assumir" esta identidade.
    const ssmRole = new aws.iam.Role("ec2-ssm-role", {
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: { Service: "ec2.amazonaws.com" },
            }],
        }),
    });

    // 2. Anexamos a política padrão da AWS para o SSM
    // A política 'AmazonSSMManagedInstanceCore' contém as permissões mínimas para o SSM funcionar.
    new aws.iam.RolePolicyAttachment("ssm-policy-attachment", {
        role: ssmRole.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    });

    // 3. Criamos o Instance Profile
    // O EC2 não entende a "Role" diretamente; ele precisa desse "contêiner" chamado Profile.
    const instanceProfile = new aws.iam.InstanceProfile("ec2-instance-profile", {
        role: ssmRole.name,
    });

    // 4. Busca Automática pela AMI (Seu código original)
    const ami = aws.ec2.getAmi({
        filters: [{ 
            name: "name", 
            values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"] 
        }],
        owners: ["099720109477"],
        mostRecent: true,
    });

    // 5. Criação da Instância com o Profile acoplado
    return new aws.ec2.Instance("minha-instancia", {
        ami: ami.then(a => a.id), 
        instanceType: "t3.micro",
        vpcSecurityGroupIds: [securityGroupId],
        
        // VINCULAÇÃO IMPORTANTE: Conecta a identidade criada acima à máquina
        iamInstanceProfile: instanceProfile.name,

        /**
         * DICA: O Ubuntu 22.04 já vem com o SSM Agent instalado de fábrica.
         * Se você usar uma imagem muito antiga ou personalizada, precisaria 
         * instalá-lo via userData, mas no Ubuntu Jammy isso é automático.
         */

        tags: { 
            Name: "Servidor-Node-SSM",
            Environment: "Desenvolvimento"
        },
    });
};