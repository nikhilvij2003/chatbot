const axios = require('axios');
//console.log("In unsplash.js file")
class UnsplashAPI {
  static async getPhoto(keyword) {
    try {
      console.log("fetching images from api")
      const res = await axios.get(`https://api.unsplash.com/search/photos?query=${keyword}&client_id=Bagj2YMtfdBjZvbe42Ld0sBNbNHt0sLaUF-kiNMbCrw&per_page=1`);
      const imageUrl = res.data.results[0].urls.regular;

      const imageResp = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      const base64Image = `data:image/jpeg;base64,${Buffer.from(imageResp.data).toString('base64')}`;
      return base64Image;
    } catch (error) {
      return 'https://example.com/default-image.jpg';
    }
  }
}

module.exports = { UnsplashAPI };
