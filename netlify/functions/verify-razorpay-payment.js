// Verify Razorpay Payment & Create Receipt
// Netlify Serverless Function
// POST /api/verify-razorpay-payment

const crypto = require('crypto');
const https = require('https');

exports.handler = async (event) => {
    // CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle Preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers
        };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            student_id,
            course_id
        } = JSON.parse(event.body);

        // Validate required fields
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !student_id || !course_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        // Get credentials from env
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

        if (!keySecret || !supabaseUrl || !supabaseServiceKey) {
            console.error('Missing environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        // Step 1: Verify signature (CRITICAL)
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.error('Signature verification failed');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Payment verification failed' })
            };
        }

        // Step 2: Fetch order from Razorpay to get trusted amount
        const order = await fetchRazorpayOrder(keyId, keySecret, razorpay_order_id);
        const amountPaid = order.amount / 100; // Convert paise to rupees
        const paymentDate = new Date().toISOString().slice(0, 10); // Server date

        // Step 3: Insert payment into Supabase
        const payment = await supabaseInsert(supabaseUrl, supabaseServiceKey, 'payments', {
            student_id,
            course_id,
            amount_paid: amountPaid,
            payment_mode: 'UPI',
            reference_id: razorpay_payment_id,
            status: 'SUCCESS',
            payment_date: paymentDate
        });

        // Step 4: Calculate balance due
        const payments = await supabaseSelect(
            supabaseUrl,
            supabaseServiceKey,
            'payments',
            `student_id=eq.${student_id}&course_id=eq.${course_id}`
        );
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);

        // Get course fee
        const courses = await supabaseSelect(supabaseUrl, supabaseServiceKey, 'courses', `id=eq.${course_id}`);
        const courseFee = courses[0]?.fee || 0;

        // Get student discount
        const students = await supabaseSelect(supabaseUrl, supabaseServiceKey, 'students', `id=eq.${student_id}`);
        const courseCode = courses[0]?.course_code;
        const discount = students[0]?.course_discounts?.[courseCode] || 0;
        const finalFee = courseFee - discount;
        const balanceDue = finalFee - totalPaid;

        // Step 5: Generate receipt ID
        const studentName = `${students[0]?.first_name || ''} ${students[0]?.last_name || ''}`.trim();
        const courseName = courses[0]?.course_name || 'Course';

        // Get receipt count for sequence
        const allReceipts = await supabaseSelect(supabaseUrl, supabaseServiceKey, 'receipts', 'order=created_at.desc&limit=1');
        let seq = 1;
        if (allReceipts.length > 0 && allReceipts[0].receipt_id) {
            const match = allReceipts[0].receipt_id.match(/^(\d+)-/);
            if (match) seq = parseInt(match[1]) + 1;
        }

        // Format: 001-ACS-KS-AWS
        const initials = studentName.split(' ').map(w => w[0]?.toUpperCase() || '').join('');
        const courseAbbr = courseName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
        const receiptId = `${String(seq).padStart(3, '0')}-ACS-${initials}-${courseAbbr}`;

        // Step 6: Insert receipt
        await supabaseInsert(supabaseUrl, supabaseServiceKey, 'receipts', {
            receipt_id: receiptId,
            payment_id: payment.id,
            student_id,
            course_id,
            amount_paid: amountPaid,
            payment_mode: 'UPI',
            reference_id: razorpay_payment_id,
            balance_due: balanceDue > 0 ? balanceDue : 0,
            payment_date: paymentDate
        });

        // Step 7: Log activity
        await supabaseInsert(supabaseUrl, supabaseServiceKey, 'activities', {
            activity_type: 'fee_recorded',
            activity_name: studentName,
            activity_link: '/admin/payments/receipts/'
        });

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                receipt_id: receiptId,
                amount_paid: amountPaid,
                balance_due: balanceDue > 0 ? balanceDue : 0
            })
        };

    } catch (error) {
        console.error('Verify payment error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Payment verification failed' })
        };
    }
};

// Helper: Fetch Razorpay Order
function fetchRazorpayOrder(keyId, keySecret, orderId) {
    return new Promise((resolve, reject) => {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

        const options = {
            hostname: 'api.razorpay.com',
            port: 443,
            path: `/v1/orders/${orderId}`,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(parsed.error?.description || 'Failed to fetch order'));
                    }
                } catch (e) {
                    reject(new Error('Invalid response from Razorpay'));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Helper: Supabase INSERT
function supabaseInsert(url, key, table, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: new URL(url).hostname,
            port: 443,
            path: `/rest/v1/${table}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Prefer': 'return=representation'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(Array.isArray(parsed) ? parsed[0] : parsed);
                    } else {
                        reject(new Error(parsed.message || 'Supabase insert failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid response from Supabase'));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Helper: Supabase SELECT
function supabaseSelect(url, key, table, query = '') {
    return new Promise((resolve, reject) => {
        const path = `/rest/v1/${table}?${query}`;

        const options = {
            hostname: new URL(url).hostname,
            port: 443,
            path,
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(Array.isArray(parsed) ? parsed : []);
                    } else {
                        reject(new Error(parsed.message || 'Supabase select failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid response from Supabase'));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}
