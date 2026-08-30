import React, { useEffect, useState } from 'react';
import tmdb from './api/tmdb';
import SearchBar from './components/SearchBar';
import MovieList from './components/MovieList';
import Loading from './components/Loading';
import ErrorMessage from './components/ErrorMessage';

function App() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genresMap, setGenresMap] = useState({});
  const [languages, setLanguages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch genres on mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await tmdb.get('/genre/movie/list');
        setGenres(res.data.genres || []);
        const map = {};
        (res.data.genres || []).forEach(g => (map[g.id] = g.name));
        setGenresMap(map);
      } catch (err) {
        setError('Failed to load genres.');
        console.error(err);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await tmdb.get('/configuration/languages');
        const list = (res.data || [])
          .map(lang => ({
            code: lang.iso_639_1 || '',
            name: lang.english_name || lang.name || lang.iso_639_1 || 'Unknown',
          }))
          .filter(lang => lang.code);
        setLanguages(list);
      } catch (err) {
        console.error('Failed to load languages.', err);
      }
    };
    fetchLanguages();
  }, []);

  // Fetch movies function
  const fetchMovies = async (pageNum = 1, overrides = {}) => {
    const activeSearchTerm = overrides.searchTerm ?? searchTerm;
    const activeSelectedGenre = overrides.selectedGenre ?? selectedGenre;
    const activeSelectedLanguage = overrides.selectedLanguage ?? selectedLanguage;
    const activeMinRating = overrides.minRating ?? minRating;

    setLoading(true);
    setError('');
    try {
      let results = [];
      if (activeSearchTerm.trim()) {
        const res = await tmdb.get('/search/movie', { params: { query: activeSearchTerm, page: pageNum } });
        results = res.data.results || [];
        if (activeSelectedGenre) {
          results = results.filter(m => Array.isArray(m.genre_ids) && m.genre_ids.includes(Number(activeSelectedGenre)));
        }
        if (activeSelectedLanguage) {
          results = results.filter(m => (m.original_language || '').toLowerCase() === activeSelectedLanguage.toLowerCase());
        }
        if (activeMinRating) {
          results = results.filter(m => m.vote_average >= Number(activeMinRating));
        }
        setTotalPages(res.data.total_pages);
      } else {
        const params = { page: pageNum, sort_by: 'popularity.desc' };
        if (activeSelectedGenre) params.with_genres = activeSelectedGenre;
        if (activeSelectedLanguage) params.with_original_language = activeSelectedLanguage;
        if (activeMinRating) params['vote_average.gte'] = activeMinRating;
        const res = await tmdb.get('/discover/movie', { params });
        results = res.data.results || [];
        setTotalPages(res.data.total_pages);
      }
      setMovies(results);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch movies. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    const resetState = {
      searchTerm: '',
      selectedGenre: '',
      selectedLanguage: '',
      minRating: 0,
    };

    setSelectedGenre(resetState.selectedGenre);
    setSelectedLanguage(resetState.selectedLanguage);
    setMinRating(resetState.minRating);
    setSearchTerm(resetState.searchTerm);
    setPage(1);
    fetchMovies(1, resetState);
  };

  // Fetch initial movies
  useEffect(() => {
    fetchMovies();
  }, []);

  return (
    <div className="app">
      <header>
        <h1>STREAMIFY</h1>
      </header>

      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSearch={() => fetchMovies(1)}
        genres={genres}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
        languages={languages}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        minRating={minRating}
        setMinRating={setMinRating}
        onClearFilters={clearFilters}
      />

      {error && <ErrorMessage message={error} />}

      <MovieList movies={movies} genresMap={genresMap} loading={loading} error={error} />

      {/* Pagination buttons */}
      {!loading && movies.length > 0 && (
        <div className="pagination-bar" aria-label="Movie pagination">
          <button
            className="pagination-button"
            disabled={page <= 1}
            onClick={() => fetchMovies(page - 1)}
          >
            ← Prev
          </button>

          <div className="pagination-indicator">
            <span className="pagination-label">Page</span>
            <strong>{page}</strong>
            <span className="pagination-divider">/</span>
            <span>{totalPages}</span>
          </div>

          <button
            className="pagination-button"
            disabled={page >= totalPages}
            onClick={() => fetchMovies(page + 1)}
          >
            Next →
          </button>
        </div>
      )}

      <footer
        style={{
          width: '100%',
          marginTop: '100px',
          padding: '20px 0',
          background: 'rgba(255, 255, 255, 0.1)', // subtle transparent layer
          backdropFilter: 'blur(6px)', // glass-like effect
          textAlign: 'center',
          color: 'white',
          fontSize: '1rem',
          fontWeight: '1000',
          letterSpacing: '0.5px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          position: 'relative',
        }}
      >
        <small>
          &copy; {new Date().getFullYear()} <strong>Harish Kumar Gatti</strong> ·
          Contact:{" "}
          <a
            href="mailto:hgatti@cisco.com"
            style={{
              color: '#1f6feb',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'color 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#fbfbfbff')}
            onMouseLeave={(e) => (e.target.style.color = '#ffffffff')}
          >
            harishkumargatti@gmail.com
          </a>{" "}
          · Data from TMDb
        </small>
      </footer>

    </div>
  );
}

export default App;
