# M-Pesa Integration Setup Guide

## Overview
This betting platform integrates with M-Pesa for deposits and withdrawals. The integration uses M-Pesa's STK Push for deposits and B2C for withdrawals.

## Environment Variables Required

### Supabase Configuration
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### M-Pesa API Configuration
```bash
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_PASSKEY=your_mpesa_passkey
MPESA_ENVIRONMENT=sandbox  # or "live" for production
MPESA_BUSINESS_SHORTCODE=174379
```

## Getting M-Pesa API Credentials

### 1. Register for M-Pesa API
- Visit [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
- Create an account and register your application
- Choose "Paybill" as your application type

### 2. Get Your Credentials
- **Consumer Key**: Found in your app dashboard
- **Consumer Secret**: Found in your app dashboard
- **Passkey**: Generated when you set up your Paybill
- **Business Shortcode**: Your assigned Paybill number

### 3. Environment Setup
- **Sandbox**: Use test credentials for development
- **Live**: Use production credentials for real transactions

## Setting Up Environment Variables

### For Local Development
Create a `.env.local` file in your project root:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### For Supabase Edge Functions
Set these in your Supabase dashboard under Settings > Edge Functions:
```bash
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_PASSKEY=your_mpesa_passkey
MPESA_ENVIRONMENT=sandbox
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Deploying Edge Functions

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link Your Project
```bash
supabase link --project-ref your_project_ref
```

### 4. Deploy Functions
```bash
supabase functions deploy mpesa-deposit
supabase functions deploy mpesa-withdraw
supabase functions deploy mpesa-callback
```

## Testing the Integration

### Sandbox Testing
1. Use sandbox environment variables
2. Test with sandbox phone numbers
3. Use test amounts (KES 1-1000)

### Live Testing
1. Switch to live environment
2. Use real M-Pesa phone numbers
3. Test with real amounts

## API Endpoints

### Deposit
- **Function**: `mpesa-deposit`
- **Method**: POST
- **Body**: `{ amount, phoneNumber, userId }`
- **Response**: STK Push sent to phone

### Withdrawal
- **Function**: `mpesa-withdraw`
- **Method**: POST
- **Body**: `{ amount, phoneNumber, userId }`
- **Response**: B2C payment initiated

### Callback
- **Function**: `mpesa-callback`
- **Method**: POST
- **Purpose**: Handles M-Pesa payment confirmations

## Security Considerations

### 1. Environment Variables
- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate keys regularly

### 2. Validation
- Validate all input data
- Check user authentication
- Verify wallet balances before transactions

### 3. Error Handling
- Implement proper error handling
- Log all transactions
- Monitor for failed payments

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check consumer key and secret
   - Verify environment (sandbox/live)

2. **STK Push Not Received**
   - Check phone number format (254xxxxxxxxx)
   - Verify business shortcode
   - Check network connectivity

3. **Callback Not Working**
   - Ensure callback URL is accessible
   - Check function deployment
   - Verify environment variables

### Debug Steps

1. Check Supabase function logs
2. Verify environment variables
3. Test with sandbox credentials first
4. Monitor network requests in browser

## Production Checklist

- [ ] Set up live M-Pesa credentials
- [ ] Configure production environment variables
- [ ] Deploy all edge functions
- [ ] Test with real phone numbers
- [ ] Set up monitoring and logging
- [ ] Configure backup procedures
- [ ] Document procedures for support team

## Support

For M-Pesa API issues:
- Contact Safaricom Developer Support
- Check M-Pesa API documentation
- Monitor Safaricom status page

For application issues:
- Check Supabase function logs
- Verify environment variables
- Test with sandbox first 