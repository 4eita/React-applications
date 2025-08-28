class WeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1';
  
  private async getCoordinates(city: string): Promise<{lat: number, lon: number}> {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error(`Ville non trouvée: ${city}`);
      }
      
      const result = data.results[0];
      return {
        lat: result.latitude,
        lon: result.longitude
      };
    } catch (error) {
      console.error('Erreur geocoding:', error);
      return { lat: 48.8566, lon: 2.3522 }; // Paris par défaut
    }
  }

  private mapWeatherCode(code: number): string {
    const weatherCodes: Record<number, string> = {
      0: 'sunny', 1: 'sunny', 2: 'cloudy', 3: 'cloudy',
      45: 'cloudy', 48: 'cloudy', 51: 'rainy', 53: 'rainy',
      55: 'rainy', 56: 'rainy', 57: 'rainy', 61: 'rainy',
      63: 'rainy', 65: 'rainy', 66: 'rainy', 67: 'rainy',
      71: 'rainy', 73: 'rainy', 75: 'rainy', 77: 'rainy',
      80: 'rainy', 81: 'rainy', 82: 'rainy', 85: 'rainy',
      86: 'rainy', 95: 'rainy', 96: 'rainy', 99: 'rainy'
    };
    
    return weatherCodes[code] || 'cloudy';
  }

  async getCurrentWeather(city: string): Promise<any> {
    try {
      const { lat, lon } = await this.getCoordinates(city);
      
      const response = await fetch(
        `${this.baseUrl}/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&timezone=Europe/Paris`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        temp: Math.round(data.current_weather.temperature),
        condition: this.mapWeatherCode(data.current_weather.weathercode),
        humidity: Math.round(data.hourly.relativehumidity_2m[0] || 50),
        windSpeed: Math.round(data.current_weather.windspeed)
      };
      
    } catch (error) {
      console.error('Erreur récupération météo:', error);
      
      return {
        temp: 20,
        condition: 'cloudy',
        humidity: 60,
        windSpeed: 10
      };
    }
  }
}

export const weatherService = new WeatherService();
