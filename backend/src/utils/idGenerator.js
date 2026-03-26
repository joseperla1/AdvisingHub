function generateQueueId(){
    return `q_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

module.exports = {
    generateQueueId
};