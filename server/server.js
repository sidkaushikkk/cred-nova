const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Mock IPFS Metadata upload endpoint for the MVPs
// In a production app, this would use Pinata or an IPFS node
app.post('/api/upload', (req, res) => {
    const data = req.body;
    
    // In a real app we'd upload 'data' to IPFS and get a cid.
    // For MVP, we generate a mock IPFS CID (Hash) based on the content
    const contentString = JSON.stringify(data);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(contentString);
    const hexHash = hashSum.digest('hex');
    
    // Mock IPFS Hash format (CIDv0 style start)
    const mockIpfsHash = 'Qm' + hexHash.substring(0, 44);

    console.log(`[IPFS Mock Upload] Stored metadata for ${data.studentName}: ${mockIpfsHash}`);
    
    // We also "store" it in memory just so the verification frontend can mock fetch it if needed. 
    // Usually fetching from IPFS is decentralized, but we'll simulate the gateway here.
    metadataStore[mockIpfsHash] = data;

    setTimeout(() => {
        res.json({ success: true, ipfsHash: mockIpfsHash });
    }, 1000); // simulate network delay
});

const metadataStore = {};

// Mock IPFS Gateway
app.get('/ipfs/:hash', (req, res) => {
    const data = metadataStore[req.params.hash];
    if (data) {
        res.json(data);
    } else {
        res.status(404).json({ error: "IPFS Hash not found in mock store" });
    }
});

// Fallback to index.html for SPA routing if needed
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
    console.log(`CredLedger server running on http://localhost:${PORT}`);
});
