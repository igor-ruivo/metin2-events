// Simple test script that reads the webhook from the environment
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

console.log('🧪 Testing Discord Webhook...');
console.log(`Webhook configured: ${webhookUrl ? 'yes' : 'no'}`);

// Test webhook with a simple message
async function testWebhook() {
    try {
        if (!webhookUrl) {
            throw new Error('DISCORD_WEBHOOK_URL is not set');
        }
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: '🧪 Test message from Metin2 Events Bot!',
                embeds: [{
                    title: 'Test Embed',
                    description: 'This is a test of the reminder system',
                    color: 0x00ff00,
                    timestamp: new Date().toISOString()
                }]
            }),
        });

        if (response.ok) {
            console.log('✅ Webhook test successful! Check your Discord channel.');
        } else {
            console.error('❌ Webhook test failed:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ Error testing webhook:', error.message);
    }
}

testWebhook();
