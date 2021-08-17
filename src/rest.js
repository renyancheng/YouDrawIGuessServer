module.exports = app => {

    // REST API
    app.get('/api/test1', (req, res) => {
        res.json({ arr: [1, 2, 3, 4, 5,] });
    });
    
}
