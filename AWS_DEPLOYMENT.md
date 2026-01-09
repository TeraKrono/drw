# AWS Deployment Instructions

## Налаштування AWS Elastic Beanstalk

### 1. Встановіть AWS CLI та EB CLI
```bash
pip install awscli awsebcli
```

### 2. Налаштуйте AWS credentials
```bash
aws configure
```
Введіть:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: us-east-1
- Output format: json

### 3. Ініціалізуйте Elastic Beanstalk
```bash
eb init -p node.js-18 draw-and-guess-game --region us-east-1
```

### 4. Створіть середовище
```bash
eb create draw-and-guess-game-env --single --instance-types t3.micro
```

### 5. Задеплойте додаток
```bash
eb deploy
```

### 6. Відкрийте додаток
```bash
eb open
```

## Налаштування GitHub Actions (автоматичний деплой)

### 1. Створіть IAM користувача
- Перейдіть в AWS Console → IAM → Users → Add User
- Виберіть "Programmatic access"
- Додайте політики:
  - AWSElasticBeanstalkFullAccess
  - AmazonS3FullAccess

### 2. Додайте секрети в GitHub
Перейдіть у Settings → Secrets and variables → Actions:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### 3. Створіть S3 bucket
```bash
aws s3 mb s3://draw-and-guess-game-deploy
```

### 4. Пуш в main автоматично задеплоїть на AWS

## Налаштування WebSocket (важливо!)

У Elastic Beanstalk потрібно увімкнути WebSocket:
1. Configuration → Load Balancer → Edit
2. Processes → default → Edit
3. Увімкніть "Sticky sessions"
4. Session stickiness duration: 3600 секунд

## Моніторинг
```bash
eb logs
eb health
eb status
```

## Оцінка витрат
- t3.micro (Free Tier): безкоштовно перші 12 місяців
- Після: ~$10-15/місяць

## Альтернативи (дешевші):
- AWS Lambda + API Gateway + Socket.IO на Redis (складніше)
- AWS Lightsail: $3.50/міс
