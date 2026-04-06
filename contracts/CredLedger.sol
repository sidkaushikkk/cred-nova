// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CredLedger {
    address public owner;

    struct Certificate {
        string ipfsHash;
        uint256 issueDate;
        bool isValid;
        address issuer;
    }

    // Mapping from Certificate ID to Certificate details
    mapping(string => Certificate) public certificates;

    event CertificateIssued(string indexed certificateId, string ipfsHash, address indexed issuer);
    event CertificateRevoked(string indexed certificateId);

    constructor() {
        owner = msg.sender;
    }

    // Function to issue a new certificate and store its IPFS hash
    function issueCertificate(string memory _certificateId, string memory _ipfsHash) public {
        require(bytes(certificates[_certificateId].ipfsHash).length == 0, "Certificate with this ID already exists");
        require(bytes(_certificateId).length > 0, "Invalid Certificate ID");
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS Hash");
        
        certificates[_certificateId] = Certificate({
            ipfsHash: _ipfsHash,
            issueDate: block.timestamp,
            isValid: true,
            issuer: msg.sender
        });

        emit CertificateIssued(_certificateId, _ipfsHash, msg.sender);
    }

    // Function to verify a certificate's authenticity
    function verifyCertificate(string memory _certificateId) public view returns (bool isValid, string memory ipfsHash, uint256 issueDate, address issuer) {
        Certificate memory cert = certificates[_certificateId];
        if (cert.isValid) {
            return (true, cert.ipfsHash, cert.issueDate, cert.issuer);
        }
        return (false, "", 0, address(0));
    }
}
