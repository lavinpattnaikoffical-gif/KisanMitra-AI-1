export interface WeatherForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitationProb: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainProbability: number;
  windSpeed: number;
  forecast: WeatherForecast[];
}
