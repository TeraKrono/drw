# Налаштування HTTPS для Elastic Beanstalk

## Простий спосіб: Використання стандартного HTTPS Elastic Beanstalk

AWS автоматично надає HTTPS для вашого домену .elasticbeanstalk.com!

Ваш HTTPS URL:
```
https://draw-and-guess-game-env.eba-ruhvdtce.eu-north-1.elasticbeanstalk.com
```

## Перевірка HTTPS

Просто змініть `http://` на `https://` у вашому URL.

Elastic Beanstalk автоматично підтримує HTTPS на порту 443 з самопідписаним сертифікатом для доменів .elasticbeanstalk.com.

## Для власного домену з безкоштовним SSL:

### 1. Отримайте безкоштовний SSL від AWS Certificate Manager:
```bash
aws acm request-certificate \
  --domain-name yourdomain.com \
  --validation-method DNS \
  --region eu-north-1
```

### 2. Додайте сертифікат до Load Balancer:
- Перейдіть у EC2 Console → Load Balancers
- Оберіть Load Balancer вашого середовища
- Додайте HTTPS listener (порт 443)
- Прикріпіть сертифікат з ACM

### 3. Налаштуйте редірект HTTP → HTTPS

Додайте правило в Load Balancer:
- IF: HTTP (порт 80)
- THEN: Redirect to HTTPS (порт 443)

## Альтернатива: Cloudflare (найпростіше)

1. Зареєструйте домен на Cloudflare
2. Додайте A-запис на IP Load Balancer
3. Увімкніть "Flexible SSL" - БЕЗКОШТОВНО
4. Cloudflare автоматично надасть HTTPS

## Поточний стан

Ваш додаток вже доступний через HTTPS за стандартним доменом AWS:
- HTTP: http://draw-and-guess-game-env.eba-ruhvdtce.eu-north-1.elasticbeanstalk.com
- HTTPS: https://draw-and-guess-game-env.eba-ruhvdtce.eu-north-1.elasticbeanstalk.com
