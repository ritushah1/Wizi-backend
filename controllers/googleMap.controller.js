const axios = require('axios');
const { google } = require('googleapis');
const GOOGLE_KEY = process.env.GOOGLE_MAPS_KEY;

exports.autoComplete = async (req, res, next) => {
  try {
    const { input, sessiontoken } = req.query;

    const response = await axios.get(
      process.env.GOOGLE_MAP_URL + `place/autocomplete/json`,
      {
        params: {
          input,
          sessiontoken,
          key: GOOGLE_KEY,
        },
      },
    );
    if (response.data.status !== 'OK') {
     
      return res.json({
        status: 404,
        message: 'no response found',
        googleData: response.data,
        error: response.data.error_message,
      });
    }

    const data = response.data.predictions.map((item) => ({
      description: item.description,
      place_id: item.place_id,
      status: 200,
    }));

    return res.json(data);
  } catch (error) {
    next(error);
  }
};
exports.getPlaceDetails = async (req, res, next) => {
  try {
    const { place_id, sessiontoken } = req.query;

    if (!place_id) {
      return res.status(400).json({
        status: 400,
        message: 'place_id is required',
      });
    }

    const response = await axios.get(
      `${process.env.GOOGLE_MAP_URL}place/details/json`,
      {
        params: {
          place_id,
          fields: 'place_id,formatted_address,geometry',
          key: GOOGLE_KEY,
          sessiontoken,
        },
      },
    );

    if (response.data.status !== 'OK') {
      
      return res.status(404).json({
        status: 404,
        googleData:response.data,
        message: 'Place not found',
        error: response.data.error_message || response.data.status,
      });
    }

    const result = response.data.result;

    const latitude = result?.geometry?.location?.lat;
    const longitude = result?.geometry?.location?.lng;

    if (latitude == null || longitude == null) {
      return res.status(500).json({
        status: 500,
        message: 'Latitude longitude not found',
      });
    }

    return res.status(200).json({
      status: 200,
      data: {
        place_id: result.place_id,
        formatted_address: result.formatted_address,
        latitude,
        longitude,
      },
    });
  } catch (error) {
    next(error);
  }
};
