# PayPal Integration Setup Guide

## Overview
This betting platform now supports both M-Pesa and PayPal payments. PayPal integration uses PayPal's Checkout API for secure online payments.

## Provided Credentials

### PayPal Sandbox Credentials
```bash
PAYPAL_CLIENT_ID=AavkSqNKh2cHSk2p4vH-3X0bPx3k_T3h6Fc9ANi2Ki-agOICTis75XogcqvgBMXhTlHwOTEt5gN7L03W
PAYPAL_CLIENT_SECRET=EIpGzdrOjREpQM5fsNCEycT-OUlmTJB4_QbJXKVCbmGKi5pySO4vJJyW1rZD08Y30ZmXi3Vp2e6vzy5R
PAYPAL_ENVIRONMENT=sandbox
```

## Environment Variables Required

### Supabase Configuration
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### PayPal Configuration
```bash
PAYPAL_CLIENT_ID=AavkSqNKh2cHSk2p4vH-3X0bPx3k_T3h6Fc9ANi2Ki-agOICTis75XogcqvgBMXhTlHwOTEt5gN7L03W
PAYPAL_CLIENT_SECRET=EIpGzdrOjREpQM5fsNCEycT-OUlmTJB4_QbJXKVCbmGKi5pySO4vJJyW1rZD08Y30ZmXi3Vp2e6vzy5R
PAYPAL_ENVIRONMENT=sandbox  # or "live" for production
```

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
PAYPAL_CLIENT_ID=AavkSqNKh2cHSk2p4vH-3X0bPx3k_T3h6Fc9ANi2Ki-agOICTis75XogcqvgBMXhTlHwOTEt5gN7L03W
PAYPAL_CLIENT_SECRET=EIpGzdrOjREpQM5fsNCEycT-OUlmTJB4_QbJXKVCbmGKi5pySO4vJJyW1rZD08Y30ZmXi3Vp2e6vzy5R
PAYPAL_ENVIRONMENT=sandbox
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
supabase functions deploy paypal-payment
supabase functions deploy paypal-capture
supabase functions deploy mpesa-deposit
supabase functions deploy mpesa-withdraw
supabase functions deploy mpesa-callback
```

## Testing the Integration

### PayPal Sandbox Testing
1. Use the provided sandbox credentials
2. Test with PayPal sandbox accounts
3. Use test amounts (KES 100-1000)

### PayPal Live Testing
1. Get live PayPal credentials from PayPal Developer Dashboard
2. Switch to live environment
3. Test with real PayPal accounts

## API Endpoints

### PayPal Payment
- **Function**: `paypal-payment`
- **Method**: POST
- **Body**: `{ amount, userId }`
- **Response**: PayPal checkout URL

### PayPal Capture
- **Function**: `paypal-capture`
- **Method**: POST
- **Body**: `{ orderId }`
- **Response**: Payment confirmation

### M-Pesa Deposit
- **Function**: `mpesa-deposit`
- **Method**: POST
- **Body**: `{ amount, phoneNumber, userId }`
- **Response**: STK Push sent

### M-Pesa Withdrawal
- **Function**: `mpesa-withdraw`
- **Method**: POST
- **Body**: `{ amount, phoneNumber, userId }`
- **Response**: B2C payment initiated

## Payment Flow

### PayPal Payment Flow
1. User selects PayPal payment method
2. User enters amount and clicks "Deposit"
3. System creates PayPal order
4. User is redirected to PayPal checkout
5. User completes payment on PayPal
6. PayPal redirects back with order ID
7. System captures payment and credits wallet

### M-Pesa Payment Flow
1. User selects M-Pesa payment method
2. User enters amount and phone number
3. System sends STK Push to phone
4. User enters M-Pesa PIN
5. M-Pesa sends callback confirmation
6. System credits user wallet

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

1. **PayPal Authentication Failed**
   - Check client ID and secret
   - Verify environment (sandbox/live)
   - Ensure credentials are correct

2. **PayPal Order Creation Failed**
   - Check amount format (must be string)
   - Verify currency code (KES)
   - Check network connectivity

3. **Payment Capture Failed**
   - Ensure order is in APPROVED state
   - Check order ID format
   - Verify payment completion

### Debug Steps

1. Check Supabase function logs
2. Verify environment variables
3. Test with sandbox credentials first
4. Monitor network requests in browser
5. Check PayPal Developer Dashboard

## Production Checklist

- [ ] Get live PayPal credentials
- [ ] Configure production environment variables
- [ ] Deploy all edge functions
- [ ] Test with real PayPal accounts
- [ ] Set up monitoring and logging
- [ ] Configure backup procedures
- [ ] Document procedures for support team

## PayPal Sandbox Test Accounts

For testing, you can use these PayPal sandbox accounts:

### Buyer Account
- Email: sb-1234567890@business.example.com
- Password: (provided in PayPal Developer Dashboard)

### Seller Account
- Email: sb-1234567890@business.example.com
- Password: (provided in PayPal Developer Dashboard)

## Support

For PayPal API issues:
- Contact PayPal Developer Support
- Check PayPal API documentation
- Monitor PayPal status page

For application issues:
- Check Supabase function logs
- Verify environment variables
- Test with sandbox first

## Integration Features

✅ **Dual Payment Methods**
- M-Pesa for local Kenyan users
- PayPal for international users

✅ **Secure Processing**
- PayPal Checkout API
- M-Pesa STK Push
- Proper authentication

✅ **User Experience**
- Payment method selection
- Clear instructions
- Success/error feedback

✅ **Transaction Tracking**
- Pending transaction records
- Successful payment updates
- Failed payment handling 