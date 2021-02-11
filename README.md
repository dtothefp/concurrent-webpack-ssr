# Concurrent Webpack SSR Boilerplate?


### To Start
- `yarn`
  - installs all dependencies for the application and for `/packages` and hoists using `yarn workspaces`
- `yarn dev`
  - starts the application in `/src` with hot reloading for client and server
- `yarn prod`
  - builds the application in `/src` to `/dist`
  - `yarn serve` serves the static assets from dist

### TODO
- add React router
- write HTML to dist for `yarn prod` based upon routes in the application


### Packages
- `yarn dev:razzle`
  - starts Razzle application in development mode
- `yarn dev:next`
  - starts NextJS application in development mode
  - To debug NextJS in `/packages/next-app/packages.json` link your local clone of `next`
  - Follow the NextJS guide for contributing https://github.com/zeit/next.js/blob/canary/contributing.md
```json
  "next": "file:../../../next-clone/packages/next",
```
