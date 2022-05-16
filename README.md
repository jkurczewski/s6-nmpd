# Serwis społecznościowy à la Tinder

Pomysł na projekt powstał na bazie popularnej aplikacji do randkowania Tinder i jest swoistym rozwinięciem zaproponowanej tam koncepcji relacji społecznych. W stworzonym modelu nacisk został postawiony na utrzymanie użytkownika i odejście od jedynie romantycznej zasady działania aplikacji. Koncept projektu przewiduje możliwość łączenia ludzi na kilku poziomach: znajomi, para, znajoma para. Takie rozwiązanie otwiera przed użytkownikiem szanse na poznanie nie tylko miłości swojego życia, a także nowych znajomych, a nawet poznania się z innymi parami.

## Instalacja

Zanim rozpoczniesz instalację upewnij się, że posiadasz: node.js, npm, yarn w najnowszych wersjach.
Następnie zainstaluj paczki dla projektu

```bash
  npm install
```

##### 1. Po zainstalowaniu paczek stwórz nową bazę danych w Neo4j.

##### 2. Po utworzeniu bazy danych skopiuj dane dostępowe do pliku .env w oparciu o plik .env.example.

##### 3. Uruchom bazę danych i zasil ją podstawowymi danymi. Kod pozwalający na stworzenie danych znajdziesz w pluku CREATE.sql

##### 4. Poleceniem poniżej uruchom aplikację.

```bash
  yarn start
```

## Dostępne metody w API

#### Pokaż wszystkich użytkowników

```http
  GET /users
```

#### Pokaż wybranego użytkownika

```http
  GET /users/:id
```

| Parametr | Typ   | Opis                         |
| :------- | :---- | :--------------------------- |
| `id`     | `int` | **Wymagane**. ID użytkownika |

#### Wyszukaj podobnych partnerów dla użytkownika

```http
  GET /partners/user/:id
```

| Parametr | Typ   | Opis                                                       |
| :------- | :---- | :--------------------------------------------------------- |
| `id`     | `int` | **Wymagane**. ID użytkownika dla którego szukasz partnerów |

#### Wyszukaj podobne pary do podanej pary

```http
  GET /partners/pair/:id
```

| Parametr | Typ   | Opis                                                                                                     |
| :------- | :---- | :------------------------------------------------------------------------------------------------------- |
| `id`     | `int` | **Wymagane**. ID użytkownika dla którego szukasz pary. Wystarczy znajomość jednego ID użytkownika z pary |

#### Pokaż listę wszystkich hobby posortowaną w zależności od popularności

```http
  GET /hobbies
```

#### Pokaż wszystkich użytkowników posiadających dane hobby

```http
  GET /hobbies/:name
```

| Parametr | Typ      | Opis                      |
| :------- | :------- | :------------------------ |
| `name`   | `string` | **Wymagane**. Nazwa hobby |

#### Stwórz relację znajomości pomiędzy dwoma użytkownikami

```http
  POST /friends/:us1&:us2
```

| Parametr | Typ   | Opis                           |
| :------- | :---- | :----------------------------- |
| `us1`    | `int` | **Wymagane**. ID Użytkownika 1 |
| `us2`    | `int` | **Wymagane**. ID Użytkownika 2 |

#### Stwórz parę pomiędzy dwoma użytkownikami

```http
  POST /relation/:us1&:us2
```

| Parametr | Typ   | Opis                           |
| :------- | :---- | :----------------------------- |
| `us1`    | `int` | **Wymagane**. ID Użytkownika 1 |
| `us2`    | `int` | **Wymagane**. ID Użytkownika 2 |
